/// <reference types="reflect-metadata" />

import { PropertyOptions, createProperty } from './lit-element.js';

export function customElement(tagname: string) {
  return (clazz: any) => {
    window.customElements.define(tagname!, clazz);
  };
}

export function property(options?: PropertyOptions) {
  return (prototype: any, propertyName: string): any => {
    options = options || {};
    options.type = options.type || reflectType(prototype, propertyName);
    createProperty(prototype, propertyName, options);
  };
}

export function attribute(attrName: string) {
  return (prototype: any, propertyName: string): any => {
    const type = reflectType(prototype, propertyName);
    createProperty(prototype, propertyName, { attrName, type });
  };
}

export function computed<T = any>(...targets: (keyof T)[]) {
  return (prototype: any, propertyName: string, descriptor: PropertyDescriptor): void => {
    const fnName = `__compute${propertyName}`;

    // Store a new method on the object as a property.
    Object.defineProperty(prototype, fnName, { value: descriptor.get });
    descriptor.get = undefined;

    createProperty(prototype, propertyName, { computed: `${fnName}(${targets.join(',')})` });
  };
}

export function listen(eventName: string, target: string|EventTarget) {
  return (prototype: any, methodName: string) => {
    if (!prototype.constructor.hasOwnProperty('listeners')) {
      prototype.constructor.listeners = [];
    }
    prototype.constructor.listeners.push({ target, eventName, handler: prototype[methodName] });
  }
};

function reflectType(prototype: any, propertyName: string): any {
  const { hasMetadata = () => false, getMetadata = () => null } = Reflect;
  if (hasMetadata('design:type', prototype, propertyName)) {
    return getMetadata('design:type', prototype, propertyName);
  }
  return null;
}