/*!
 * JSON-Entity
 *
 * Copyright 2017 Josh Swan
 * Released under the MIT license
 * https://github.com/joshswan/json-entity/blob/master/LICENSE
 */

require('mocha');

const should = require('should');
const sinon = require('sinon');
const Entity = require('../');

/**
 * Constructor
 */
it('should return an instance of Entity', (done) => {
  should(new Entity({})).be.instanceof(Entity);

  done();
});

it('should accept entity definitions with boolean, function, and object options', (done) => {
  const definition = {
    id: true,
    name(obj) {
      return obj.name;
    },
    emailAddress: { as: 'email' },
    // Should not be included
    test: false,
  };

  const User = new Entity(definition);

  User.properties.should.eql([
    { as: 'id', key: 'id' },
    { as: 'name', key: 'name', mode: 'fn', value: definition.name },
    { as: 'email', key: 'emailAddress' },
  ]);

  done();
});

it('should throw for invalid entity defintion options', (done) => {
  should(() => new Entity({ id: 'string' })).throw('json-entity: unknown options type for property id');

  done();
});

/**
 * Entity.isEntity
 */
it('should expose static isEntity helper method to check if object is an instance of Entity', (done) => {
  const instance = new Entity({});

  Entity.isEntity(instance).should.eql(true);
  Entity.isEntity({}).should.eql(false);

  done();
});

/**
 * Entity.prototype.extend
 */
it('should allow instances to be extended', (done) => {
  const Base = new Entity({ id: true });
  const Extended = Base.extend({ name: true });

  Extended.properties.should.eql([
    { as: 'id', key: 'id' },
    { as: 'name', key: 'name' },
  ]);

  done();
});

/**
 * Entity.prototype.expose
 */
it('should add exposed property to this.properties array', (done) => {
  const instance = new Entity();

  instance.expose('id');

  instance.properties.should.eql([
    { as: 'id', key: 'id' },
  ]);

  done();
});

it('should include allowed options in this.properties object', (done) => {
  const instance = new Entity();
  const using = new Entity();

  const opts = { as: 'id', default: null, if: () => true, merge: true, using, value: null, other: 'something' };
  instance.expose('_id', opts);

  instance.properties.should.eql([
    { as: 'id', key: '_id', default: null, if: opts.if, merge: true, mode: 'val', using, value: null },
  ]);

  done();
});

it('should throw when specified "if" option is not a function', (done) => {
  const instance = new Entity();

  should(() => instance.expose('id', { if: true })).throw('json-entity: "if" must be a function!');

  done();
});

it('should throw when specified "using" option is not an Entity', (done) => {
  const instance = new Entity();

  should(() => instance.expose('id', { using: {} })).throw('json-entity: "using" must be an Entity!');

  done();
});

it('should set mode flag when value option specified', (done) => {
  const instance = new Entity();

  const fn = () => 1;
  const val = 1;

  instance.expose('fn', { value: fn });
  instance.expose('val', { value: val });

  instance.properties.should.eql([
    { as: 'fn', key: 'fn', mode: 'fn', value: fn },
    { as: 'val', key: 'val', mode: 'val', value: val },
  ]);

  done();
});

/**
 * Entity.prototype.represent
 */
it('should return new object representation of supplied data', (done) => {
  const data = { id: 1 };
  const representation = new Entity({ id: true }).represent(data);

  data.should.eql(representation);
  data.should.not.equal(representation);

  done();
});

it('should only include exposed fields in representation', (done) => {
  new Entity({ id: true }).represent({ id: 1, admin: true }).should.eql({ id: 1 });

  done();
});

it('should not include any undefined fields in representation', (done) => {
  new Entity({ id: true }).represent({ admin: true }).should.eql({});

  done();
});

it('should alias property when "as" option specified', (done) => {
  new Entity({ _id: { as: 'id' } }).represent({ _id: 1 }).should.eql({ id: 1 });

  done();
});

it('should use "default" option as value when undefined', (done) => {
  new Entity({ admin: { default: false } }).represent({}).should.eql({ admin: false });

  done();
});

it('should expose property when "if" option specified and returns truthy', (done) => {
  const User = new Entity({ name: { if: (user, opts) => opts.output === 'full' } });

  User.represent({ name: 'Josh' }).should.eql({});
  User.represent({ name: 'Josh' }, { output: 'full' }).should.eql({ name: 'Josh' });

  done();
});

it('should merge arrays/objects when "merge" option specified', (done) => {
  const User = new Entity({
    id: true,
    location: { merge: true },
    roles: { as: 'scopes', merge: true },
    scopes: { merge: true },
  });

  User.represent({ id: 1, location: { city: 'San Francisco', region: 'CA' }, roles: ['admin'], scopes: ['user'] }).should.eql({
    id: 1,
    city: 'San Francisco',
    region: 'CA',
    scopes: ['admin', 'user'],
  });

  done();
});

it('should not include non-array/object data when "merge" option specified', (done) => {
  new Entity({ location: { merge: true } }).represent({ location: 'San Francisco' }).should.eql({});

  done();
});

it('should use Entity representation when "using" option specified', (done) => {
  const Location = new Entity({
    city: true,
    region: true,
  });

  const User = new Entity({
    location: { using: Location },
  });

  User.represent({ location: { city: 'San Francisco', region: 'CA', country: 'US' } }).should.eql({
    location: {
      city: 'San Francisco',
      region: 'CA',
    },
  });

  done();
});

it('should use always use value when "value" option specified', (done) => {
  new Entity({ id: { value: 1 } }).represent({ id: 5 }).should.eql({ id: 1 });

  done();
});

it('should use function to determine value when specified', (done) => {
  const User = new Entity({
    name(user) { return `${user.firstName} ${user.lastName}`; },
  });

  User.represent({ firstName: 'Josh', lastName: 'Swan' }).should.eql({
    name: 'Josh Swan',
  });

  done();
});

it('should apply represent to all items if array supplied', (done) => {
  new Entity({ id: true }).represent([
    { id: 1, name: 'Bob' },
    { id: 2, name: 'John' },
  ]).should.eql([
    { id: 1 },
    { id: 2 },
  ]);

  done();
});

it('should pass represent options object to if/value functions', (done) => {
  const data = { id: 1 };
  const options = { test: true };

  const stub = sinon.stub().returns(true);

  new Entity({ id: { if: stub } }).represent(data, options);
  stub.calledOnce.should.eql(true);
  stub.calledWith(data, options).should.eql(true);

  stub.reset();

  new Entity({ id: stub }).represent(data, options);
  stub.calledOnce.should.eql(true);
  stub.calledWith(data, options).should.eql(true);

  done();
});

it('should pass represent options object to "using" nested Entities', (done) => {
  const location = {};
  const options = { test: true };

  const Location = new Entity();

  const stub = sinon.stub(Location, 'represent');

  new Entity({ location: { using: Location } }).represent({ location }, options);

  stub.calledOnce.should.eql(true);
  stub.calledWith(location, options).should.eql(true);

  done();
});
