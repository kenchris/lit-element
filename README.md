# lit-element
A base class for creating web components using [lit-html](https://travis-ci.org/PolymerLabs/lit-html)


## Overview

`lit-element` lets you create web components with [HTML templates](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) expressed with JavaScript [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), and efficiently render and _re-render_ those templates to DOM.

`lit-element` accomplishes this by integrating [lit-html](https://travis-ci.org/PolymerLabs/lit-html) and has the following features:

* DOM updates are batched and rendered asynchronously
* Easy querying of element by `id` in the shadow root using `this.$(...)`
* Allows defining properties which should invalidate the content when changed
* Properties can have default values
* Properties can be reflected with any attribute you define
* Depends on ES modules

### Demos

Demos can be found [here](https://kenchris.github.io/lit-element/).

### Basic example

Simple write your HTML code using ```lit-html``` by creating a ```renderCallback()``` method.

```javascript 
import { LitElement, html } from '/src/lit-element.js';

  class HelloWorld extends LitElement {
    renderCallback() {
      return html`
        <div style="font-weight: bold">Hello World</div>
      `;
    }
  }
  customElements.define('hello-world', HelloWorld)
```
```html
  <hello-world></hello-world>
```

### Example: Querying elements by `id`

After contents has been rendered the first time (ie. after ```connectedCallback()``` fires), then you can access elements in the shadow root by ```id``` using ```this.$(...)```.

In the below example, we call ```this.changeColor()``` whenever the button is pressed, which in result accesses the div using ```this.$("wrapper")``` and modifies its background color.

```javascript 
  class ColorMarker extends LitElement {
    changeColor() {
      const color = Math.random().toString(16).substr(2, 6);
      // Easily query the element by id:
      this.$("wrapper").style.backgroundColor = `#${color}`;
    }

    renderCallback() {
      return html`
        <style>
          div {
            background-color: yellow;
          }
        </style>
        <button on-click=${() => this.changeColor()}>
          Change background color
        </button>
        <div id="wrapper"><slot></slot></div>
      `;
    }
  }
  customElements.define('color-marker', ColorMarker);
```
```html
  <color-marker>Horse</color-marker>
```

### Example: using properties

In this example we will use properties. Every property defined in the static getter ```properties()``` will make sure the content is re-rendered at the right time when modified.

Properties can have default values and can even be reflected via attributes (changes go both ways). Instead of doing magic and converting cases after special rules like ```upper-case``` vs ```upperCase```, you instead define example which attribute name the property should reflect to, and thus avoid any ambiguity.

NOTE, when using properties, you MUST call ```this.withProperties``` before using the elements. As the method returns the class itself, this can be done as part of ```customElements.define(...)```

```javascript 
import { LitElement, html } from '/src/lit-element.js';

  class HelloWorld extends LitElement {
    static get properties() {
      return {
        uppercase: {
          type: Boolean,
          value: false,
          attrName: "uppercase"
        }
      }
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
```
```html
   <hello-world></hello-world>
   <hello-world uppercase="uppercase">¡Hola, mundo!</hello-world>
```