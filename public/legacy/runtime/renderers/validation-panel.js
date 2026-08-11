import { assertValidationResult } from '../validators/validation-result.js';

export function renderValidationPanel({ result, panel, title, message, validTitle, invalidTitle }) {
  const safeResult = assertValidationResult(result);
  panel.classList.toggle('valid', safeResult.valid);
  panel.classList.toggle('invalid', !safeResult.valid);
  panel.dataset.validationCode = safeResult.code;
  panel.querySelector('span').textContent = safeResult.valid ? '✓' : '!';
  title.textContent = safeResult.valid ? validTitle : invalidTitle;
  message.textContent = safeResult.message;
  return safeResult;
}
