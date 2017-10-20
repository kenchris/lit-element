// @ts-check
import { html, render } from '/node_modules/lit-html/lib/lit-extended.js';

export { html } from '/node_modules/lit-html/lib/lit-extended.js';

/*
 
We skip the case conversion and have the property definition
include the attribute name. No ambiguity that way.

USAGE EXAMPLE:

export class HelloWorld extends LitElement {
  static get properties() {
    return {
      uppercase: {
        type: Boolean,
        value: false,
        attrName: "uppercase"
      }
    }
  }

  async connectedCallback() {
    await super.connectedCallback();
    this.$("box").style.backgroundColor = "blue";
  }
  
  renderCallback() {
    return html`
      <style>
        .uppercase {
          text-transform: uppercase;          
        }
      </style>
      <div id="box" class$="${this.uppercase ? 'uppercase' : ''}">
        <slot>Hello World</slot>
      </div>
    `;
  }
}
customElements.define('hello-world', HelloWorld.withProperties());
*/

export class LitElement extends HTMLElement {

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

      return this;
    }
  }

  renderCallback() {
    return html``;
  }
  
  attributeChangedCallback(prop, oldValue, newValue) {
    const symbol = Symbol.for(prop);
    const { type: typeFn } = this.constructor.properties[prop];

    if (typeFn.name === 'Boolean') {
      this[symbol] = (newValue === prop);
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

  $(id) {
    if (!this._$) {
      this._$ = new Map;
    }
    let value = this._$[id];
    if (!value) {
      value = this._$[id] = this.shadowRoot.getElementById(id);
    }
    return value;
  }
};