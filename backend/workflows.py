"""
调试工作流实现
"""

import re
import time
import json
from typing import Dict, Any, List, Optional, Tuple, Iterator
from dataclasses import dataclass
from models.factory import ModelFactory
from models.base import ModelInterface
from config import Config

def simulate_stream(event_name: str, content: str):
    yield {"status": "step_started", "event_name": event_name, "content": ""}

    current_content = ""
    # 将内容按空格分割并处理
    tokens = re.split(r'(\s+)', content)
    for token in tokens:
        time.sleep(0.04)
        current_content += token
        yield {"status": "step_progress", "event_name": event_name, "content": current_content.strip()}

    yield {"status": "step_completed", "event_name": event_name, "content": content}

def run_workflow(
    model: ModelInterface,
    content: str,
    stream: bool = True
) -> Iterator[Dict[str, Any]]:
    """运行调试工作流，分阶段调度 LLM 步骤并流式返回各阶段结果"""

    chat_params = {
        "temperature": 0.7,
    }

    def run_llm_step(event_name: str, messages: List[Dict[str, str]]) -> Iterator[Tuple[str, Dict[str, Any]]]:
        """封装每一步LLM调用，统一流式输出处理"""
        try:
            yield {"status": "step_started", "event_name": event_name, "content": ""}
            current_content = ""

            if stream:
                for chunk in model.chat_completion_stream(messages, **chat_params):
                    content_chunk = chunk.get("content", "")
                    if content_chunk:
                        current_content += content_chunk
                        yield {"status": "step_progress", "event_name": event_name, "content": current_content}
            else:
                response = model.chat_completion(messages, stream=False, **chat_params)
                current_content = response.get("content", "")
                yield {"status": "step_result", "event_name": event_name, "content": current_content}

            yield {"status": "step_completed", "event_name": event_name, "content": current_content}

        except Exception as e:
            yield {"status": "step_error", "event_name": event_name, "content": f"处理步骤时出错: {str(e)}"}

    def run_step_and_capture(event_name: str, messages: List[Dict[str, str]]):
        """运行并捕获某一步的最终输出内容"""
        result = ""
        for data in run_llm_step(event_name, messages):
            yield data
            if data['status'] == "step_completed":
                result = data['content']
        return event_name, result

    def yield_step(event_name: str, system_prompt: str, user_content: str):
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
        return run_step_and_capture(event_name, messages)

    # ========== 步骤 1：判断是否为代码 ==========
    analyze_prompt = """You are a professional AI debug assistant. Please analyze the user's input. 
        If it is a piece of code, provide a brief and accurate description of what the code does. 
        If it is not related to code, respond with: 'This input does not appear to be related to code.'"""

    event_name, analysis_result = None, ""
    for data in run_llm_step("Analyzing Problem", [
        {"role": "system", "content": analyze_prompt},
        {"role": "user", "content": content + "\n" + analyze_prompt},
    ]):
        yield data
        if data['status'] == "step_completed":
            analysis_result = data['content']

    if "This input does not appear to be related to code" in analysis_result:
        yield from simulate_stream("Workflow Aborted", "I couldn't detect any code in your input. If you want me to debug something, please paste your function or script.")
        return

    # ========== 步骤 2：提取代码 ==========
    _, code_result = yield from yield_step("Extracting Code",
        "You are an expert code extractor. Extract only the code from the user's input. If multiple code blocks are present, combine them into a single coherent piece. Do not include any explanation or comments — output only the code block.",
        content)

    # ========== 步骤 3：生成测试用例 ==========
    _, test_cases = yield from yield_step("Resolve Testcases",
        """You are an expert test case generator. First, check if the user's input already includes test cases.
        If test cases are present, extract and return only those test cases without modification. 
        If no test cases are found, then generate appropriate and executable test cases to verify the code's functionality. 
        Return only test code block — do not include any explanation or comments.""",
        code_result)

    # ========== 步骤 4：分析复杂度 ==========
    _, complexity_raw = yield from yield_step("Check Complexity",
        "You are an expert code complexity analyzer. Analyze the given code and determine its complexity level (simple, medium, or hard). Your response should explicitly include one of these exact labels: 'simple', 'medium', or 'hard'.",
        code_result)

    complexity = "Simple"
    complexity_text = complexity_raw.lower()
    if "medium" in complexity_text:
        complexity = "Medium"
    elif "hard" in complexity_text or "complex" in complexity_text:
        complexity = "Hard"

    # ========== 步骤 5：修复代码 ==========
    fix_event_name = f"{complexity} Fix"
    fix_prompt_map = {
        "Simple": "You are an expert debugging assistant. The code provided is relatively simple. Identify and fix any issues. Provide only the fixed code, without any additional explanation or comments.",
        "Medium": "You are an expert debugging assistant. The code provided is of medium complexity. Take a step-by-step approach to identify and fix issues. Provide only the fixed code, without any additional explanation or comments.",
        "Hard": "You are an expert debugging assistant. The code provided is complex. Take a systematic approach to analyze and fix the issues. Provide only the fixed code, without any additional explanation or markdown formatting."
    }
    _, fixed_code = yield from yield_step(fix_event_name, fix_prompt_map[complexity], code_result)

    # ========== 步骤 6：评估修复结果 ==========
    _, eval_result = yield from yield_step("Evaluate Fix",
        "You are an expert code evaluator. Evaluate the fixed code for correctness and efficiency.",
        fixed_code)

    yield from simulate_stream("Workflow Done", "Debugging workflow completed successfully.")

    # ========== 步骤 7：流式发送完整代码 ==========
    yield from simulate_stream("Full Code", fixed_code)

