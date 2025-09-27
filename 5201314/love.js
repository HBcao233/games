(function(){
window['$'] = document.querySelector.bind(document);
window['$$'] = document.querySelectorAll.bind(document);

const calculate = (expression) => {
  expression = expression.replace(/\s+/g, '');
  if (!/^[0-9+\-*]+$/.test(expression)) {
    throw new Error('表达式只能包含数字0-9和运算符+-*');
  }
  // 验证表达式不能为空
  if (!expression) {
    throw new Error('表达式不能为空');
  }
  // 验证不能以运算符开头或结尾
  if (/^[+\-*]/.test(expression)) {
    throw new Error('表达式不能以运算符开头');
  }
  if (/[+\-*]$/.test(expression)) {
    throw new Error('表达式不能以运算符结尾');
  }
  if (/[+\-*]{2,}/.test(expression)) {
    throw new Error('表达式不能包含连续的运算符');
  }
  
  // 解析数字和运算符
  const tokens = [];
  let currentNumber = '';
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    
    if (/\d/.test(char)) {
      currentNumber += char;
    } else {
      if (currentNumber) {
        tokens.push(parseInt(currentNumber));
        currentNumber = '';
      }
      tokens.push(char);
    }
  }
  
  // 添加最后一个数字
  if (currentNumber) {
    tokens.push(parseInt(currentNumber));
  }
  
  // 验证tokens的结构：应该是数字-运算符-数字的模式
  if (tokens.length % 2 === 0) {
    throw new Error('表达式格式错误');
  }
  
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) {
      // 偶数位置应该是数字
      if (typeof tokens[i] !== 'number') {
        throw new Error('表达式格式错误：期望数字');
      }
    } else {
      // 奇数位置应该是运算符
      if (!['+', '-', '*'].includes(tokens[i])) {
        throw new Error('表达式格式错误：期望运算符');
      }
    }
  }
  
  // 先处理乘法运算
  for (let i = 1; i < tokens.length; i += 2) {
    if (tokens[i] === '*') {
      const result = tokens[i - 1] * tokens[i + 1];
      tokens.splice(i - 1, 3, result);
      i -= 2; // 调整索引
    }
  }
  
  // 再处理加减运算
  let result = tokens[0];
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i];
    const operand = tokens[i + 1];
    
    if (operator === '+') {
      result += operand;
    } else if (operator === '-') {
      result -= operand;
    }
  }
  return result;
}
  
const getNums = () => {
  const digits = ['5', '2', '0', '1', '3', '1', '4'];
  const operators = ['+', '-', '*'];
  const results = {};
  
  // 生成所有可能的运算符组合（6个位置）
  function genCombinations() {
    const combinations = [];
    
    function backtrack(current, depth) {
      if (depth === 6) {
        combinations.push([...current]);
        return;
      }
      
      // 可以选择不插入运算符（空字符串）或插入运算符
      current.push('');
      backtrack(current, depth + 1);
      current.pop();
      
      for (const op of operators) {
        current.push(op);
        backtrack(current, depth + 1);
        current.pop();
      }
    }
    
    backtrack([], 0);
    return combinations;
  }
  
  const combinations = genCombinations();
  
  function countChar(str, char) {
    return str.split(char).length - 1;
  }
  
  for (const ops of combinations) {
    // 构建表达式字符串
    let expression = '';
    for (let i = 0; i < digits.length; i++) {
      expression += digits[i];
      if (i < ops.length && ops[i] !== '') {
        expression += ops[i];
      }
    }
    
    try {
      // 计算表达式结果
      const result = eval(expression);
      
      // 如果结果还没有被记录，则添加
      if (!(result in results)) {
        results[result] = expression;
      } else {
        if (
          (!/([+\-*])0(\d)/.test(expression))
          && countChar(expression, '*') < countChar(results[result], '*')
        ) {
          results[result] = expression;
        }
      }
    } catch (error) {
      // 忽略无效表达式
      continue;
    }
  }
  
  // 处理负号开头的情况
  for (const ops of combinations) {
    let expression = '-';
    for (let i = 0; i < digits.length; i++) {
      expression += digits[i];
      if (i < ops.length && ops[i] !== '') {
        expression += ops[i];
      }
    }
    
    try {
      const result = eval(expression);
      if (!(result in results)) {
        results[result] = expression;
      }
    } catch (error) {
      continue;
    }
  }
  
  return results;
}
  
const Nums = getNums();
window['Nums'] = Nums;
const numsReversed = Object.keys(Nums).map(x => parseInt(x)).sort((a, b) => b-a);

const getMinDiv = (num) => {
  if (num < 0) for (let i = numsReversed.length - 1; i >= 0; i--)
    if (num <= numsReversed[i])
      return numsReversed[i];
  for (let i = 0; i < numsReversed.length; i++)
    if (num >= numsReversed[i])
      return numsReversed[i];
}
const isDotRegex = /\.(\d+?)0{0,}$/

const converter = (num) => {
  if (typeof num !== "number")
    return ""

  if (num === Infinity || Number.isNaN(num))
    return `喵喵喵${num}？`

  if (!Number.isInteger(num)) {
    // abs(num) is definitely smaller than 2**51
    // rescale
    const n = num.toFixed(16).match(isDotRegex)[1].length
    return `(${converter(num * Math.pow(10, n))})/(10)^(${n})`
  }

  if (Nums[num])
    return String(num)

  const div = getMinDiv(num)
  return (`${div}*(${converter(Math.floor(num / div))})+` +
    `(${converter(num % div)})`).replace(/\*\(1\)|\+\(0\)$/g, "")
}

const formater = (expr) => {
  expr = expr.replace(/[\-\d]+/g, (n) => Nums[n]).replace("^", "**")
  // *(n) 替换为 *n
  while (expr.match(/[\*]\([^\+\-\(\)]+\)/))
    expr = expr.replace(/([\*])\(([^\+\-\(\)]+)\)/, (m, $1, $2) => $1 + $2)
  // +(xxx)- 替换为 +xxx-
  while (expr.match(/[\+|\-]\([^\(\)]+\)[\+|\-|\)]/))
    expr = expr.replace(/([\+|\-])\(([^\(\)]+)\)([\+|\-|\)])/, (m, $1, $2, $3) => $1 + $2 + $3)
  // 结尾的 +(xxx) 替换为 +xxx
  while (expr.match(/[\+|\-]\(([^\(\)]+)\)$/))
    expr = expr.replace(/([\+|\-])\(([^\(\)]+)\)$/, (m, $1, $2) => $1 + $2)
  // 如果最外层有括号，将其去掉。
  if (expr.match(/^\([^\(\)]+?\)$/))
    expr = expr.replace(/^\(([^\(\)]+)\)$/, "$1")

  expr = expr.replace(/\+-/g,'-')
  return expr
}

const love = (num) => formater(converter(num));

if ("object" == typeof exports && "object" == typeof module) {
  module.exports = love;
} else {
  if ("function" == typeof define && define.amd) {
    define("love", [], love)
  } else {
    if ("object" == typeof exports) {
      exports.love = love;
    } else {
      window.love = love;
    }
  }
}
})();