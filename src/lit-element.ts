import { html, render } from '../node_modules/lit-html/lib/lit-extended.js';
import { TemplateResult } from '../node_modules/lit-html/lit-html.js';

export { html } from '../node_modules/lit-html/lib/lit-extended.js';
export { TemplateResult } from '../node_modules/lit-html/lit-html.js';

export interface PropertyOptions {
  type?: BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor|
  ArrayConstructor | ObjectConstructor;
  value?: any;
  attrName?: string;
  computed?: string;
}

export interface ListenerOptions {
  target: string | EventTarget,
  eventName: string,
  handler: Function
}

export interface Map<T> {
  [key: string]: T;
}

export function createProperty(prototype: any, propertyName: string, options: PropertyOptions = {}): void {
  if (!prototype.constructor.hasOwnProperty('properties')) {
    Object.defineProperty(prototype.constructor, 'properties', { value: {} });
  }
  prototype.constructor.properties[propertyName] = options;
  // Cannot attach from the decorator, won't override property.
  Promise.resolve().then(() => attachProperty(prototype, propertyName, options));
}

function attachProperty(prototype: any, propertyName: string, options: PropertyOptions) {
  const { type: typeFn, attrName } = options;

  function get(this: LitElement) { return this.__values__[propertyName]; }
  function set(this: LitElement, v: any) {
    // @ts-ignore
    let value = (v === null || v === undefined) ? v : (typeFn === Array ? v : typeFn(v));
    this._setPropertyValue(propertyName, value);
    if (attrName) {
      this._setAttributeValue(attrName, value, typeFn);
    }
    this.invalidate();
  }

  Object.defineProperty(prototype, propertyName, options.computed ? {get} : {get, set});
}

export function whenAllDefined(result: TemplateResult) {
  const template = result.template;
  const rootNode = template.element.content;
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT, null as any, false);

  const deps = new Set();
  while (walker.nextNode()) {
    const element = walker.currentNode as Element;
    if (element.tagName.includes('-')) {
      deps.add(element.tagName.toLowerCase());
    }
  }

  return Promise.all(Array.from(deps).map(tagName => customElements.whenDefined(tagName)));
}

export class LitElement extends HTMLElement {
  private _needsRender: boolean = false;
  private _lookupCache: Map<HTMLElement> = {};
  private _attrMap: Map<string> = {};
  private _deps: Map<Array<Function>> = {};
  __values__: Map<any> = {};

  _setPropertyValue(propertyName: string, newValue: any) {
    this.__values__[propertyName] = newValue;
    if (this._deps[propertyName]) {
      this._deps[propertyName].map((fn: Function) => fn());
    }
  }

  _setPropertyValueFromAttributeValue(attrName: string, newValue: any) {
    const propertyName = this._attrMap[attrName];
    const { type: typeFn } = (this.constructor as any).properties[propertyName];

    let value;
    if (typeFn.name === 'Boolean') {
      value = (newValue === '') || (!!newValue && newValue === attrName.toLowerCase());
    } else {
      value = (newValue !== null) ? typeFn(newValue) : undefined;
    }
    this._setPropertyValue(propertyName, value);
  }

  _setAttributeValue(attrName: string, value: any, typeFn: any) {
    // @ts-ignore
    if (typeFn.name === 'Boolean') {
      if (!value) {
        this.removeAttribute(attrName);
      } else {
        this.setAttribute(attrName, '');
      }
    } else {
      this.setAttribute(attrName, value);
    }
  }

  static get properties(): Map<PropertyOptions> {
    return {};
  }

  static get listeners(): Array<ListenerOptions> {
    return [];
  }

  static get observedAttributes(): string[] {
    return Object.keys(this.properties)
      .map(key => (<any>this.properties)[key].attrName)
      .filter(name => name);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    for (const propertyName in (this.constructor as any).properties) {
      const options = (this.constructor as any).properties[propertyName];
      const { value, attrName, computed } = options;

      // We can only handle properly defined attributes.
      if (typeof(attrName) === 'string' && attrName.length) {
        this._attrMap[attrName] = propertyName;
      }
      // Properties backed by attributes have default values set from attributes, not 'value'.
      if (!attrName && value !== undefined) {
        this._setPropertyValue(propertyName, value);
      }

      const match = /(\w+)\((.+)\)/.exec(computed);
      if (match) {
        const fnName = match[1];
        const targets = match[2].split(/,\s*/);

        const computeFn = () => {
          const values = targets.map(target => (<any>this)[target]);
          if ((<any>this)[fnName] && values.every(entry => entry !== undefined)) {
            const computedValue = (<any>this)[fnName].apply(this, values);
            this._setPropertyValue(propertyName, computedValue);
          }
        };

        for (const target of targets) {
          if (!this._deps[target]) {
            this._deps[target] = [ computeFn ];
          } else {
            this._deps[target].push(computeFn);
          }
        }
        computeFn();
      }
    }
  }

  static withProperties() {
    for (const propertyName in this.properties) {
      attachProperty(this.prototype, propertyName, this.properties[propertyName]);
    }
    return this;
  }

  renderCallback() {
    render(this.render(this), this.shadowRoot as ShadowRoot);
  }

  // @ts-ignore
  render(self: any): TemplateResult {
    return html``;
  }

  attributeChangedCallback(attrName: string, _oldValue: string, newValue: string) {
    this._setPropertyValueFromAttributeValue(attrName, newValue);
    this.invalidate();
  }

  connectedCallback() {
    for (const attrName of (this.constructor as any).observedAttributes) {
      this._setPropertyValueFromAttributeValue(attrName, this.getAttribute(attrName));
    }

    this.invalidate().then(() => {
      for (const listener of (this.constructor as any).listeners as Array<ListenerOptions>) {
        const target = typeof listener.target === 'string' ? this.$(listener.target) : listener.target;
        target.addEventListener(listener.eventName, listener.handler.bind(this));
      }
    });
  }

  async invalidate() {
    if (!this._needsRender) {
      this._needsRender = true;
      // Schedule the following as micro task, which runs before
      // requestAnimationFrame. All additional invalidate() calls
      // before will be ignored.
      // https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
      this._needsRender = await false;
      this.renderCallback();
    }
  }

  $(id: string) {
    let value = this._lookupCache[id];
    if (!value && this.shadowRoot) {
      const element = this.shadowRoot.getElementById(id);
      if (element) {
        value = element;
        this._lookupCache[id] = element;
      }
    }
    return value;
  }
}