# json-entity
[![NPM Version][npm-image]][npm-url] [![Build Status][build-image]][build-url] [![Coverage Status][coverage-image]][coverage-url] [![Dependency Status][depstat-image]][depstat-url] [![Dev Dependency Status][devdepstat-image]][devdepstat-url]

The goal of this package is to provide an easy, reusable, and secure way to control and format data for output (e.g. from a REST API). Using an Entity, you can specify the fields you'd like to be included in the output representation of your data, as well as additional options for tweaking the structure. In this manner, this package takes a whitelist-only approach, forcing clear definitions of properties that will be exposed. This package is heavily inspired by [Grape::Entity](https://github.com/ruby-grape/grape-entity).

## Example
```javascript
const User = new Entity({
  // Use `true` to always expose a field
  id: true,
  firstName: true,
  lastName: true,

  // Use a function to return a custom value (return `undefined` to hide in JSON)
  fullName(user, options) {
    return `${user.firstName} ${user.lastName}`;
  },

  // Use an object to specify additional options
  location: {
    // Expose field using an alternate name
    as: 'hometown',

    // Expose field only if function returns "truthy"
    if: (user, options) => options.output === 'full' },

    // See additional options below
  },
});

User.represent({
  id: 1,
  firstName: 'Josh',
  lastName: 'Swan',
  location: 'San Francisco, CA',
}, { output: 'full' });

/*
    {
      id: 1,
      firstName: "Josh",
      lastName: "Swan",
      fullName: "Josh Swan",
      hometown: "San Francisco, CA"
    }
 */
```

## Methods

### `Entity.isEntity`
Static helper method to determine whether a supplied object is an Entity.
```javascript
Entity.isEntity(new Entity({})); // true
Entity.isEntity({}); // false
```

### `extend`
Create a new Entity using the current Entity as a base. The new Entity inherits all exposed properties from the base in addition to any new properties specified on the object passed to `extend`.
```javascript
const User = new Entity({
  id: true,
  firstName: true,
});

const UserFull = User.extend({
  lastName: true,
  location: true,
});

User.represent({ id: 1, firstName: 'Josh', lastName: 'Swan', location: 'San Francisco, CA' });
// { id: 1, firstName: "Josh" }

UserFull.represent({ id: 1, firstName: 'Josh', lastName: 'Swan', location: 'San Francisco, CA' });
// { id: 1, firstName: "Josh", lastName: "Swan", location: "San Francisco, CA" }
```

### `represent`
Use the exposed properties defined on the Entity to create a new object from the supplied data. Only whitelisted/exposed properties will be included in the resulting object, and any options specified will be used to modify the output.
```javascript
const User = new Entity({
  id: true,
  firstName: true,
});

const user = { id: 1, firstName: 'Josh', lastName: 'Swan' };

const representation = User.represent(user);
// { id: 1, firstName: "Josh" }

console.log(user === representation); // false
```

## Options
The following options can be specified using the { [property]: {options} } syntax shown in the example above. Multiple options can be specified and will work together, though some combinations may be logically incompatible.

### as `String`
Expose a property using an alternate name.
```javascript
const Example = new Entity({
  fullName: { as: 'name' },
});

Example.represent({ fullName: 'Josh Swan' }));
// { name: "Josh Swan" }
```

### default `Any`
Provide a default value in case the property is not defined.
```javascript
const Example = new Entity({
  admin: { default: false },
});

Example.represent({}));
// { admin: false }
```

### if `Function`
Conditionally expose a field based on function return value ("truthy" = expose). The function is invoked with the same arguments as `represent` (i.e. `data, [options={}]`);
```javascript
const Example = new Entity({
  country: { if: (obj, opts) => obj.country !== 'US' },
});

Example.represent({ country: 'CA' }));
// { country: "CA" }

Example.represent({ country: 'US' }));
// { }
```

### merge `Boolean`
Merge properties into parent directly (or concatenate if array). NOTE: When merging arrays from multiple properties using `as`, the `merge` option must be specified on all properties that will be merged or those without will overwrite any existing values during the merge process (see example below).
```javascript
const Example = new Entity({
  id: true,
  address: { merge: true },
});

Example.represent({ id: 1, address: { city: 'San Francisco', region: 'CA', country: 'US' } }));
// { id: 1, city: "San Francisco", region: "CA", country: "US" }

const Example2 = new Entity({
  id: true,
  roles: { merge: true },
  scopes: { as: 'roles', merge: true }, // Merge into `roles` - must also specify `merge` on `roles`
});

Example2.represent({ id: 1, roles: ['admin'], scopes: ['user'] });
// { id: 1, roles: ['admin', 'user'] }
```

### using `Entity`
Apply an Entity to the value of the property (for nesting Entities).
```javascript
const User = new Entity({
  id: true,
  firstName: true,
});

const Example = new Entity({
  user: { using: User },
});

Example.represent({ user: { id: 1, firstName: 'Josh', lastName: 'Swan', location: 'San Francisco, CA' } }));
// { user: { id: 1, firstName: "Josh" } }
```

### value `Any`
Always use the specified value for this property, regardless of property value in supplied data.
```javascript
const Example = new Entity({
  id: true,
  type: { value: 'User' },
});

Example.represent({ id: 1, type: 'AdminUser' }));
// { id: 1, type: "User" }
```

[build-url]: https://travis-ci.org/joshswan/json-entity
[build-image]: https://travis-ci.org/joshswan/json-entity.svg?branch=master
[coverage-url]: https://coveralls.io/github/joshswan/json-entity
[coverage-image]: https://coveralls.io/repos/github/joshswan/json-entity/badge.svg
[depstat-url]: https://david-dm.org/joshswan/json-entity
[depstat-image]: https://david-dm.org/joshswan/json-entity.svg
[devdepstat-url]: https://david-dm.org/joshswan/json-entity#info=devDependencies
[devdepstat-image]: https://david-dm.org/joshswan/json-entity/dev-status.svg
[npm-url]: https://www.npmjs.com/package/json-entity
[npm-image]: https://badge.fury.io/js/json-entity.svg
