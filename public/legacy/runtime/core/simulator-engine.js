import { assertValidationResult } from '../validators/validation-result.js';

function requireFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`Simulator engine requires ${name}().`);
  return value;
}

export function createSimulatorEngine(configuration) {
  const createInitialState = requireFunction(configuration?.createInitialState, 'createInitialState');
  const cloneState = requireFunction(configuration?.cloneState, 'cloneState');
  const validateState = requireFunction(configuration?.validate, 'validate');
  const renderState = requireFunction(configuration?.render, 'render');
  const renderValidation = requireFunction(configuration?.renderValidation, 'renderValidation');
  const resetValidation = requireFunction(configuration?.resetValidation, 'resetValidation');
  const serializeState = requireFunction(configuration?.serialize, 'serialize');
  const recordAttempt = configuration.recordAttempt;
  let state = cloneState(createInitialState());

  function read() {
    return cloneState(state);
  }

  function serialize() {
    const snapshot = serializeState(read());
    JSON.stringify(snapshot);
    return snapshot;
  }

  function commit(nextState, options = {}) {
    state = cloneState(nextState);
    if (options.resetValidation !== false) resetValidation();
    if (options.render !== false) renderState(read());
    return read();
  }

  function update(reducer, options) {
    requireFunction(reducer, 'state reducer');
    return commit(reducer(read()), options);
  }

  function replace(nextState, options) {
    return commit(nextState, options);
  }

  function reset(options) {
    return commit(createInitialState(), options);
  }

  function validate(options = {}) {
    const result = assertValidationResult(validateState(read()));
    renderValidation(result);
    if (options.recordAttempt !== false && typeof recordAttempt === 'function') {
      void recordAttempt(serialize(), result);
    }
    return result;
  }

  function initialize() {
    resetValidation();
    renderState(read());
    return read();
  }

  return Object.freeze({ initialize, read, replace, reset, serialize, update, validate });
}
