const MAX_EXPRESSION_LENGTH = 128;

export const evaluateArithmeticExpression = expression => {
  const input = String(expression).replace(/\s+/g, '');
  if (!input || input.length > MAX_EXPRESSION_LENGTH) {
    throw new Error('Enter a valid arithmetic expression.');
  }

  let position = 0;
  let operations = 0;

  const parseExpression = () => {
    let value = parseTerm();
    while (input[position] === '+' || input[position] === '-') {
      const operator = input[position++];
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
      operations += 1;
    }
    return value;
  };

  const parseTerm = () => {
    let value = parseUnary();
    while (input[position] === '*' || input[position] === '/') {
      const operator = input[position++];
      const right = parseUnary();
      if (operator === '/' && right === 0) {
        throw new Error('Division by zero is not allowed.');
      }
      value = operator === '*' ? value * right : value / right;
      operations += 1;
    }
    return value;
  };

  const parseUnary = () => {
    if (input[position] === '+' || input[position] === '-') {
      const negative = input[position++] === '-';
      const value = parseUnary();
      operations += 1;
      return negative ? -value : value;
    }
    return parsePrimary();
  };

  const parsePrimary = () => {
    if (input[position] === '(') {
      position += 1;
      const value = parseExpression();
      if (input[position] !== ')') {
        throw new Error('Check the parentheses in the expression.');
      }
      position += 1;
      return value;
    }

    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(input.slice(position));
    if (!match) {
      throw new Error('Use numbers and only +, -, *, /, and parentheses.');
    }
    position += match[0].length;
    return Number(match[0]);
  };

  const result = parseExpression();
  if (position !== input.length || operations > MAX_EXPRESSION_LENGTH) {
    throw new Error('Check the arithmetic expression.');
  }
  if (!Number.isFinite(result)) {
    throw new Error('The arithmetic result is outside the supported range.');
  }
  return result;
};
