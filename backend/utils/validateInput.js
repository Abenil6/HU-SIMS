const mongoose = require('mongoose');

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validators = {
  string(value) {
    return typeof value === 'string';
  },
  number(value) {
    return typeof value === 'number' && Number.isFinite(value);
  },
  boolean(value) {
    return typeof value === 'boolean';
  },
  array(value) {
    return Array.isArray(value);
  },
  object(value) {
    return isPlainObject(value);
  },
  date(value) {
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value !== 'string') return false;
    return !Number.isNaN(new Date(value).getTime());
  },
  objectId(value) {
    return mongoose.Types.ObjectId.isValid(String(value));
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeValue = (value, rule = {}) => {
  if (rule.type === 'string' && typeof value === 'string') {
    return rule.trim ? value.trim() : value;
  }

  if (rule.type === 'number' && typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (rule.type === 'boolean' && typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  return value;
};

const validateField = (key, value, rule, req) => {
  const errors = [];

  if (value === undefined || value === null) {
    if (rule.required) {
      errors.push(`${key} is required`);
    }
    return errors;
  }

  if (rule.type && validators[rule.type] && !validators[rule.type](value)) {
    errors.push(`${key} must be a valid ${rule.type}`);
    return errors;
  }

  if (rule.type === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`${key} must be at least ${rule.minLength} characters`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`${key} must be at most ${rule.maxLength} characters`);
    }
    if (rule.format === 'email' && !EMAIL_REGEX.test(value)) {
      errors.push(`${key} must be a valid email address`);
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${key} is invalid`);
    }
  }

  if (rule.type === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${key} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${key} must be at most ${rule.max}`);
    }
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
  }

  if (rule.type === 'array') {
    if (rule.minItems !== undefined && value.length < rule.minItems) {
      errors.push(`${key} must contain at least ${rule.minItems} item(s)`);
    }
    if (rule.maxItems !== undefined && value.length > rule.maxItems) {
      errors.push(`${key} must contain at most ${rule.maxItems} item(s)`);
    }
    if (rule.items && rule.items.type && validators[rule.items.type]) {
      value.forEach((item, index) => {
        if (!validators[rule.items.type](item)) {
          errors.push(`${key}[${index}] must be a valid ${rule.items.type}`);
        }
      });
    }
  }

  if (typeof rule.custom === 'function') {
    const result = rule.custom(value, req);
    if (result !== true && typeof result === 'string') {
      errors.push(result);
    }
  }

  return errors;
};

const buildValidator = (schema = {}, options = {}) => {
  const {
    source = 'body',
    allowUnknown = true,
    abortEarly = false,
    normalize = true,
  } = options;

  return (req, res, next) => {
    const payload = req[source] || {};

    if (!isPlainObject(payload)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${source} payload`,
        errors: [`${source} must be an object`],
      });
    }

    const errors = [];

    if (!allowUnknown) {
      const allowedKeys = new Set(Object.keys(schema));
      Object.keys(payload).forEach((key) => {
        if (!allowedKeys.has(key)) {
          errors.push(`Unexpected field: ${key}`);
        }
      });
    }

    Object.entries(schema).forEach(([key, rule]) => {
      const currentRule = rule || {};
      const rawValue = payload[key];
      const value = normalize ? normalizeValue(rawValue, currentRule) : rawValue;

      if (normalize && value !== rawValue) {
        req[source][key] = value;
      }

      const fieldErrors = validateField(key, value, currentRule, req);
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: abortEarly ? [errors[0]] : errors,
      });
    }

    return next();
  };
};

const validateBody = (schema, options = {}) =>
  buildValidator(schema, { ...options, source: 'body' });

const validateQuery = (schema, options = {}) =>
  buildValidator(schema, { ...options, source: 'query' });

const validateParams = (schema, options = {}) =>
  buildValidator(schema, { ...options, source: 'params' });

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  buildValidator,
};
