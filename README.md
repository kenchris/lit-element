# lit-element
A base class for creating web components using [lit-html](https://travis-ci.org/PolymerLabs/lit-html)

`lit-element` can be installed via the [lit-html-element](https://www.npmjs.com/package/lit-html-element) NPM package.

## Overview

`lit-element` lets you create web components with [HTML templates](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) expressed with JavaScript [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), and efficiently render and _re-render_ those templates to DOM.

`lit-element` accomplishes this by integrating [lit-html](https://github.com/PolymerLabs/lit-html) and has the following features:
* Depends on ES modules and Web Components (polyfills can also be used)
* Quite small (around 1kB compressed), with only a dependency on [lit-html](https://github.com/PolymerLabs/lit-html)
* Good test coverage
* Easy rendering by implementing ```render()``` methods
  * DOM updates are batched and rendered asynchronously
  * Pre/post render hooks possible via ```renderCallback```
  * Manually trigger re-rendering by calling ```invalidate()```
  * Access properties and methods using ```this``` or destructoring
* Allows defining properties with additional powers
  * Content is invalidated as properties change
  * Properties can define types used for conversion
  * Properties can have default values
  * Properties/attributes can auto-reflect
    * Mapping name is up to user, no automatical case-conversion happens
    * Default values of auto-reflected properties depend on presence of attributes
  * Properties can be automatically calculated from other properties
* Easy querying of element by `id` in the shadow root using `this.$(...)`

### Demos

Demos can be found [here](https://kenchris.github.io/lit-element/).

### Basic example

Simple write your HTML code using ```lit-html``` by creating a ```render()``` method.

```javascript
import { LitElement, html } from '/src/lit-element.js';

class HelloWorld extends LitElement {
  render() {
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

  render() {
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

NOTE, attributes default values are set from the element attributes themselves (present or missing) and thus default values set via 'value' are ignored.

```javascript
import { LitElement, html } from '/src/lit-element.js';

class HelloWorld extends LitElement {
  static get properties() {
    return {
      uppercase: {
        type: Boolean,
        attrName: "uppercase"
      }
    }
  }

  render() {
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
<hello-world uppercase>¡Hola, mundo!</hello-world>
```

## Attribute reflection

The presence of attributes or not results in actual values, ie. a missing boolean attribute is considered false and all other attributes are considered ```null```. This means that when mapping properties to attributes, there is no such thing as a default value as values are always defined depending on the presence of attributes or not. This means that setting ```value:``` is ignored when ```attrName:``` is present.

Values are converted using their type constructors, ie ```String(attributeValue)``` for ```String```, ```Number(attributeValue)``` for ```Number```, etc.

```Boolean``` has special handling in order to follow the patterns of the Web Platform.

From the HTML standard:

> The presence of a boolean attribute on an element represents the true value, and the absence of the attribute represents the false value.
>
> If the attribute is present, its value must either be the empty string or a value that is an ASCII case-insensitive match for the attribute's canonical name, with no leading or trailing whitespace.

```Array``` and ```Object``` are disencouraged for attributes and have no special handling, thus values are converted using their constructors as any other value types, except boolean.

## Access element properties and methods from destructoring

```this``` is passed to render() for you, which is cleaner. particularly when destructuring. You can still reference them manually, though.

```javascript
class RenderShorthand extends LitElement {
  static get properties() {
    return {
      greeting: {
        type: String,
        value: "Hello"
      }
    }
  }

  render({ greeting }) {
    return html`${greeting} World!`;
  }
}
customElements.define('render-shorthand', RenderShorthand.withProperties());
```

## Warning about element upgrading

Custom elements need to be upgraded before they work. This happens automatically by the browser when it has all the resources it needs.

This mean that if you do a custom element which depends on other custom elements and use properties for data flow, then setting those properties before the element is upgraded, mean that you will end up shadowing the ```lit-html-element``` properties, meaning that the property updates and attribute reflection won't work.

There is a work around for this in ```lit-html-element``` which works by first rendering when all dependencies are present, so you don't need to worryabout setting properties using ``` html`...` ``` inside elements built
using ```LitElement```.

But you might still manage to shadow properties if you manual set values before upgraded like

```javascript
document.getElementById('ninja').firstName = "Ninja";
```

So guard these the following way:

```javascript
customElements.whenDefined('computed-world').then(() => {
  document.getElementById('ninja').firstName = "Ninja";
});
```

## Advanced

### Automatical re-rendering

When any of the properties in ```properties()``` change, `lit-element` will automatically re-render. The same goes for attributes which are mapped to properties via ```attrName```.

If you need to re-render manually, you can trigger a re-render via a call to ```invalidate()```. This will schedule a microtask which will render the content just before next ```requestAnimationFrame```.

### Custom hooks before and after rendering

If you need to do extra work before rendering, like setting a property based on another property, a subclass can override ```renderCallback()``` to do work before or after the base class calls ```render()```, including setting the dependent property before ```render()```.

### Computed properties

If you need some properties that are calculated and updates depending on other properties, that is possible using the 'computed' value, which defined an object method with arguments as a string.

NOTE, computed properties can not be reflected to attributes.

Eg.

```javascript
import { LitElement, html } from '/node_modules/lit-html-element/lit-element.js';

class ComputedWorld extends LitElement {
  static get properties() {
    return {
      firstName: {
        type: String,
        attrName: "first-name"
      },
      doubleMessage: {
        type: String,
        computed: 'computeDoubleMessage(message)'
      },
      message: {
        type: String,
        computed: 'computeMessage(firstName)',
        value: 'Hej Verden'
      }
    }
  }
  computeDoubleMessage(message) {
    return message + " " + message;
  }
  computeMessage(firstName) {
    return `Konichiwa ${firstName}`;
  }
  render() {
    return html`
      <div style="font-weight: bold">${this.doubleMessage}</div>
    `;
  }
}
customElements.define('computed-world', ComputedWorld.withProperties())
```
```html
<computed-world></computed-world>
<computed-world first-name="Kenneth"></computed-world>
```