import { html, render } from '/node_modules/lit-html/lib/lit-extended.js';
import { TemplateResult } from '/node_modules/lit-html/lit-html.js';

export { html } from '/node_modules/lit-html/lib/lit-extended.js';

export class LitElement extends HTMLElement {
  _needsRender: Boolean = false;
  _$: Map<string, Node>;
  static properties: any = {};

  static get observedAttributes() {
    let attrs = [];
    for (const prop in this.properties) {
      if (this.properties[prop].attrName) {
        attrs.push(prop);
      }
    }
    return attrs;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._needsRender = false;
  }

  static withProperties() {
    for (const prop in this.properties) {
      const symbol = Symbol.for(prop);
      const { type: typeFn, value, attrName } = this.properties[prop];

      Object.defineProperty(this.prototype, prop, {
        get() { return this[symbol] || value; },
        set(v) {
          let value = typeFn(v)
          this[symbol] = value;
          if (attrName) {
            if (typeFn.name === 'Boolean') {
              if (!value) {
                this.removeAttribute(attrName);  
              } else {
                this.setAttribute(attrName, attrName);
              }
            } else {
              this.setAttribute(attrName, value);
            }
          }
          this.invalidate();
        },
      });
    }
    return this;
  }

  renderCallback(): TemplateResult {
    return html``;
  }
  
  attributeChangedCallback(prop: string, _oldValue: string, newValue: string) {
    const symbol = Symbol.for(prop);
    const { type: typeFn } = this.constructor.properties[prop];

    if (typeFn.name === 'Boolean') {
      this[symbol] = !newValue || (newValue === prop);
    } else {
      this[symbol] = typeFn(newValue)
    }

    this.invalidate();
  }

  connectedCallback() {
    // FIXME: Should we force render here?
    this.invalidate();
  }

  invalidate() {
    if (!this._needsRender) {
      this._needsRender = true;
      Promise.resolve().then(() => {
        this._needsRender = false;
        render(this.renderCallback(), this.shadowRoot);
      });
    }
  }

  $(id: string) {
    if (!this._$) {
      this._$ = new Map<string, Node>();
    }
    let value = this._$[id];
    if (!value) {
      value = this._$[id] = this.shadowRoot.getElementById(id);
    }
    return value;
  }
};