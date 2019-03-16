/*!
 * JSON-Entity
 *
 * Copyright 2017-2019 Josh Swan
 * Released under the MIT license
 * https://github.com/joshswan/json-entity/blob/master/LICENSE
 */

export = Entity;

declare class Entity<T = any> {
  static isEntity(obj: any): boolean;

  constructor(config: Entity.EntityConfig<T>);

  properties: Entity.EntityProperty<T>[];

  expose(property: keyof T, options?: Entity.EntityProperty<T>): void;
  extend(config: Entity.EntityConfig<T>): Entity<T>;
  represent(obj: T, options?: Entity.EntityOptions): object;
}

declare namespace Entity {
  export interface EntityOptions {
    [key: string]: any;
    safe?: boolean;
  }

  export interface EntityProperty<T = any> {
    [key: string]: any;
    as?: string;
    autoload?: any;
    default?: any;
    filter?: (item: any, obj: T, options: EntityOptions) => boolean;
    if?: (obj: T, options: EntityOptions) => boolean;
    key: string;
    merge?: boolean;
    require?: boolean;
    using?: Entity;
    value?: (obj: T, options: EntityOptions) => any | any;
  }

  export interface EntityConfig<T = any> {
    [key: string]: boolean | ((obj: T, options: EntityOptions) => any) | EntityProperty;
  }
}
