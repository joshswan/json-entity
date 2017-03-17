/*!
 * JSON-Entity
 *
 * Copyright 2017 Josh Swan
 * Released under the MIT license
 * https://github.com/joshswan/json-entity/blob/master/LICENSE
 */

const assert = require('assert');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isObject = require('lodash/isObject');
const pick = require('lodash/pick');

// Error message helper
const error = err => `json-entity: ${err}`;

class Entity {
  /**
   * Static helper to determine if passed object is an Entity instance
   * @param  {Object}  entity Object to test
   * @return {Boolean}
   */
  static isEntity(entity) {
    return entity instanceof Entity;
  }

  /**
   * Entity constructor
   * Exposes properties using the definition objects passed as arguments.
   * @param {Object} entityDefinitions Entity definitions object(s)
   */
  constructor(...entityDefinitions) {
    // Initialize properties array that will store properties exposed via the `expose` method
    this.properties = [];

    // Loop through all arguments passed to constructor
    entityDefinitions.forEach((definition) => {
      // Allow both arrays (for extending) and objects
      Object.keys(definition).forEach((key) => {
        const opts = definition[key];

        // Check for key option among options to avoid setting property keys to numeric indexes when
        // using properties array from extended instance
        const property = opts.key || key;

        // Call expose method with appropriate options
        switch (typeof opts) {
          // { [property]: true } always exposes
          case 'boolean':
            if (opts === true) this.expose(property);
            break;
          // { [property]: [function] } runs custom function to determine value
          // Return `undefined` to hide in JSON
          case 'function':
            this.expose(property, { value: opts });
            break;
          // { [property]: {options} } allows specification of options (e.g. as, if)
          case 'object':
            this.expose(property, opts);
            break;
          // Throw error for any other options types
          default:
            throw new TypeError(error(`unknown options type for property ${property}`));
        }
      });
    });
  }

  /**
   * Expose specified property with provided options
   * Note: This method is meant to be internal so that Entity definitions are clear and easy to
   * follow for better security (same reason there is no `unexpose` method). Use at your own risk!
   *
   * Available Options (all optional):
   * - as      {String}   Expose property using a different name
   * - default {Any}      Provide a default value to use if property does not exist
   * - if      {Function} Expose property only if specified function returns truthy
   * - merge   {Boolean}  Combine arrays or merge object keys into parent object
   * - using   {Entity}   Use specified Entity to represent value before exposing
   * - value   {Any}      Provide a hard-coded value that will always be used for property
   *
   * @param {String} property     Property name/key
   * @param {Object} [options={}] Expose options (as, default, if, merge, using, value)
   */
  expose(property, options = {}) {
    // Extract valid options
    const opts = pick(options, ['as', 'default', 'if', 'merge', 'using', 'value']);

    // Validate options
    if (opts.if) assert(isFunction(opts.if), error('"if" must be a function!'));
    if (opts.using) assert(Entity.isEntity(opts.using), error('"using" must be an Entity!'));

    // Set "mode" flag to avoid having to check later if value option exists and/or is function
    if (opts.value !== undefined) opts.mode = isFunction(opts.value) ? 'fn' : 'val';

    this.properties.push(Object.assign(opts, {
      // Make sure "as" is defined as final property value (alias or current name)
      as: opts.as || property,
      // Specify actual property key for extracting value
      key: property,
    }));
  }

  /**
   * Extend an Entity instance with additional properties
   * Note: The extended Entity will inherit all exposed properties from its parent. To hide
   * properties, you must create a new Entity instead.
   * @param  {Object} entityDefinitions Entity definitions object(s)
   * @return {Entity}
   */
  extend(...entityDefinitions) {
    return new Entity(this.properties, ...entityDefinitions);
  }

  /**
   * Use Entity to create a representation of supplied data
   * Only properties that have been exposed in the Entity will be included in the resulting
   * object(s) and any specified options will be applied during representation.
   * @param  {Array|Object} data         Data to be represented
   * @param  {Object}       [options={}] Options (passed to if/value functions & nested Entities)
   * @return {Array|Object}
   */
  represent(data, options = {}) {
    // If data is an array, call represent on all objects within
    if (isArray(data)) return data.map(entity => this.represent(entity, options));

    // Create new representation object
    return this.properties.reduce((result, opts) => {
      // Check "if" returns truthy, if specified
      if (opts.if && !opts.if(data, options)) return result;

      let val;

      // Determine property value using "mode" flag
      switch (opts.mode) {
        // Function specified; call to retrieve value
        case 'fn':
          val = opts.value(data, options);
          break;
        // Hard-coded value specified; use value
        case 'val':
          val = opts.value;
          break;
        // Retrieve value from data using property key
        default:
          val = data[opts.key];
      }

      // Check if value has been set
      if (val === undefined) {
        // Apply default, if specified
        if (opts.default !== undefined) {
          val = opts.default;
        } else {
          // Otherwise, skip property
          return result;
        }
      }

      // Apply "using" Entity to value, if specified
      if (opts.using) val = opts.using.represent(val, options);

      // Check if merge option specified and if val is an array
      if (opts.merge) {
        // Check if val is an array that we need to merge
        if (isArray(val)) {
          // Throw an error if merging with non-array
          assert(result[opts.as] === undefined || isArray(result[opts.as]), error(`attempting to merge array with non-array for property ${opts.as}!`));

          // Set array at appropriate key and merge in any existing values
          result[opts.as] = [...(result[opts.as] || []), ...val];
        // Otherwise, check if val is an object
        } else if (isObject(val)) {
          // Merge child keys by setting them directly instead of mounting entire object
          Object.keys(val).forEach((key) => { result[key] = val[key]; });
        }
      } else {
        // Otherwise, just set value with appropriate key on result object
        result[opts.as] = val;
      }

      return result;
    }, {});
  }
}

module.exports = Entity;
