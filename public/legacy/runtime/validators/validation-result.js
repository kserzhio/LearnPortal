export function validationResult(valid, code, message, affectedIds = []) {
  return Object.freeze({
    valid: Boolean(valid),
    code: String(code),
    message: String(message),
    affectedIds: [...affectedIds],
  });
}

export function assertValidationResult(result) {
  if (!result || typeof result.valid !== 'boolean' || !result.code || !result.message || !Array.isArray(result.affectedIds)) {
    throw new TypeError('Simulator validator must return { valid, code, message, affectedIds }.');
  }
  return result;
}
