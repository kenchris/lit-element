# lit-element
A base class for creating web components using [lit-html](https://travis-ci.org/PolymerLabs/lit-html)

`lit-element` can be installed via the [lit-html-element](https://www.npmjs.com/package/lit-html-element) NPM package.

## Overview

`lit-element` lets you create web components with [HTML templates](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) expressed with JavaScript [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), and efficiently render and _re-render_ those templates to DOM.

`lit-element` accomplishes this by integrating [lit-html](https://github.com/PolymerLabs/lit-html) and has the following features:
* Depends on ES modules and Web Components (polyfills can also be used)
* Quite small (around 1kB compressed), with only a dependency on [lit-html](https://github.com/PolymerLabs/lit-html)
* Works great with TypeScript with additional features such as decorators.
* Good test coverage
* Easy rendering by implementing ```render()``` methods
  * DOM updates are batched and rendered asynchronously
  * Pre/post render hooks possible via ```renderCallback```
  * Manually trigger re-rendering by calling ```invalidate()```
  * Access properties and methods using ```this``` or destructuring
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

When creating custom elements, a good pattern is to use attributes instead of methods or properties. This allows using the element declaratively like ```<my-dialog opened>```.

For custom elements only consumed internally in other custom elements, it is often faster just relying on properties. This is also the case if you need to pass along complex data such as arrays or objects.

In order to make it easy to work with attributes, ```lit-html-element``` supports mapping between attributes and properties automatically, just by defining the name of the attribute the property should map with via ```attrName:```.

The presence of attributes or not (on elements) results in *actual values*, ie. a missing attribute for a boolean property, means the property will be ```false``` and for all other property types, ```undefined```. This means that when mapping properties to attributes, there is no such thing as a default value as values are always defined depending on the presence, or not, of attributes. This means that setting ```value:``` is ignored when ```attrName:``` is present.

Values are converted using their type constructors, ie ```String(attributeValue)``` for ```String```, ```Number(attributeValue)``` for ```Number```, etc.

```Boolean``` has special handling in order to follow the patterns of the Web Platform.

From the HTML standard:

> The presence of a boolean attribute on an element represents the true value, and the absence of the attribute represents the false value.
>
> If the attribute is present, its value must either be the empty string or a value that is an ASCII case-insensitive match for the attribute's canonical name, with no leading or trailing whitespace.

```Array``` and ```Object``` are disencouraged for attributes and have no special handling, thus values are converted using their constructors as any other value types, except boolean.

## Access element properties and methods from Destructuring

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

## Advanced

### Automatical re-rendering

When any of the properties in ```properties()``` change, `lit-element` will automatically re-render. The same goes for attributes which are mapped to properties via ```attrName```.

If you need to re-render manually, you can trigger a re-render via a call to ```invalidate()```. This will schedule a microtask which will render the content just before next ```requestAnimationFrame```.

### Element upgrading

Custom elements need to be upgraded before they work. This happens automatically by the browser when it has all the resources it needs.

This mean that if you do a custom element which depends on other custom elements and use properties for data flow, then setting those properties before the element is upgraded, mean that you will end up shadowing the ```lit-html-element``` properties, meaning that the property updates and attribute reflection won't work as expected.

There is an API ```whenAllDefined(result, container)``` for working around this issue, by allowing to wait until all of the dependencies have been upgraded. One way to use it is overwriting the ```renderCallback()```:

```javascript
renderCallback() {
  if ("resolved" in this) {
    super.renderCallback();
  } else {
    whenAllDefined(this.render(this)).then(() => {
      this.resolved = true;
      this.renderCallback();
    });
  }
}
```

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

### Computed properties

If you need some properties that are calculated and updates depending on other properties, that is possible using the 'computed' value, which defined an object method with arguments as a string.

Computed properties *only* update when *all dependent properties are defined*. Default value can be set using ```value:```

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

## Extensions for TypeScript

It is possible to use ```lit-html-element``` from TypeScript instead of JavaScript. When using TypeScript, you can opt into using decorators instead of defining the static properties accessor ```static get properties()```.

When using property decorators any such static property accessor will be ignored, and you don't need to call ```.withProperties()``` either.

```typescript
import {
  LitElement,
  html,
  TemplateResult,
  customElement,
  property,
  attribute,
  computed
} from '../../src/lit-element.js';

@customElement('test-element')
export class TestElement extends LitElement {
  @computed('firstName', 'lastName')
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @property() firstName: string = 'John';
  @property() lastName: string = 'Doe';

  @property() human: boolean = true;
  @property() favorite: any = { fruit: 'pineapple'};
  @property() kids: Array<string> = ['Peter', 'Anna'];

  @attribute('mother') mother: string;
  @attribute('super-star') superStar: boolean;

  render(): TemplateResult {
    return html`
      <h2>Name: ${this.fullName}</h2>
      <h2>Is human?: ${human ? "yup" : "nope"}</h2>
      <h2>Favorites: ${JSON.stringify(this.favorite)}</h2>
      <h2>Kids: ${JSON.stringify(this.kids)}</h2>
      <h2>Mother: '${this.mother}'</h2>
      <h2>Superstar?: '${this.superStar}'</h2>
    `;
  }
}

```

```html
<test-element super-star mother="Jennifer"></test-element>
```

### How to enable

In order to use decorators from TypeScript you need to enabled the ```experimentalDecorators``` compiler setting in your ```tsconfig.json``` or use the ```--experimentalDecorators``` flag.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

With the above enabled, you can start using decorators but MUST specify the type information manually:

```typescript
@property({type: String})
myProperty: string;
```

As the type often can be derives from the property, especially in TypeScript where you define the type, this feels like a bit of double work. Luckily there is a new specification proposal called [Metadata Reflection](https://rbuckton.github.io/reflect-metadata/) which aims at solving this problem. This proposal has yet to be formally proposed to the TC39 working group (defines the JavaScript standard) but there is already a working polyfill available and experimental support in TypeScript.

With Metadata Reflection enabled it is possible to define property types more concisely:

```typescript
@property() myProperty: string;
```

In order to use decorators from TypeScript follow the following steps.

1. You need to enabled the ```emitDecoratorMetadata``` compiler setting in your ```tsconfig.json``` or use the ```--emitDecoratorMetadata``` flag.

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true
  }
}
```

2. Install the Metadata Reflection API runtime polyfill from [rbuckton/reflect-metadata](https://github.com/rbuckton/reflect-metadata):

```bash
$ npm install --save-dev rbuckton/reflect-metadata
```

3. Load the polyfill at the top-level of your application:

```html
<script src="/node_modules/reflect-metadata/Reflect.js"></script>
```

# API documentation

The following API documentation uses Web IDL.

### Static property accessor and `PropertyOptions`

PropertyOptions are used for configuring the properties for the custom element. In JavaScript you need to implement a static property accessor called `properties`, which returns an object where each property of that object has an associated `PropertyOptions`:

```javascript
class {
  static get properties() {
    return { selfDefinedObjectProperty: ... }
  }
}
```

The `PropertyOptions` dictionary has 4 optional properties, shown below in Web IDL format.

```idl
typedef (BooleanConstructor or DateConstructor or NumberConstructor or StringConstructor or ArrayConstructor or ObjectConstructor) PropertyType;

dictionary PropertyOptions {
  attribute PropertyType type;
  attribute any value;
  attribute USVString attrName;
  attribute USVString computed;
}
```

#### The `type` property
The `type` property is only optional when using decorators and Metadata Reflection.

#### The `value` property

The `value` property defines a default value for the property. In case of attribute / property mapping via `attrName` (see below), `value` is ignored. When using decorators, the value is taking from the property definition itself:

```typescript
@property() myProperty: string = "Hello World";
```

#### The `attrName` property

The `attrName` defines the name of the attribute which should be reflected with the property and the other way around. With `attrName`, default values are ignored and determined from the custom element instead, ie. depending on the presence or not of the attributes.

The attribute name, much be in Latin letters (a-z) including '-' (hyphen). All attributes on HTML elements in HTML documents get ASCII-lowercased automatically, and initial hyphen ('-') gets ignored.

Be aware that data attributes, ie. attributes starting with `data-` are accessible as properties automatically via `element.dataset`.

##### Mapping from property to attribute

When mapped properties get set on the element, the attribute gets updated with the string representation of the new value, unless the new value is `undefined` in which the attribute gets removed.

There is one exception to this, as boolean properties as reflected differently. Setting the property to `true` and the attribute (say `attr`) is set to the empty string `''` (meaning attribute is present, ie. `<div attr>`). Setting the property to `false` and the attribute is removed, ie. `<div>`.

##### Mapping from attribute to property

When the attributes are set, the values are converted using their type constructors, ie ```String(attributeValue)``` for ```String```, ```Number(attributeValue)``` for ```Number```, etc.

```Boolean``` has special handling in order to follow the patterns of the Web Platform.

From the HTML standard:

> The presence of a boolean attribute on an element represents the true value, and the absence of the attribute represents the false value.
>
> If the attribute is present, its value must either be the empty string or a value that is an ASCII case-insensitive match for the attribute's canonical name, with no leading or trailing whitespace.

Read more in the [Attribute reflection](#attribute-reflection) section above.

#### The `computed` property

Properties can be calculated from other properties using ```computed```, it takes a string like `'methodName(property1, property2)'`, where `methodName` is a method on the element and `property1` and `property2` are defined.

Computed properties *only* update when *all dependent properties are defined*. Default value can be set using ```value:```

NOTE, computed properties can not be reflected to attributes.

### `renderCallback`

The `renderCallback` allows for custom hooks before and after rendering.

If you need to do extra work before rendering, like setting a property based on another property, a subclass can override ```renderCallback()``` to do work before or after the base class calls ```render()```, including setting the dependent property before ```render()```.

### `withProperties()`

TODO:

### `render(HTMLElement this)`

TODO: Move docs here

### `async invalidate()`

TODO: Move docs here

### `$(DOMString id)`

TODO: Move docs here

### `whenAllDefined(TemplateResult result)`

TODO: Move docs here

## Decorators

### `@customElement(USVString tagname)`

A class decorator for registering the custom element

```typescript
@customElement('my-element')
class extends HTMLElement {
   ...
}
```

### `@property(optional PropertyOptions options)`

A property decorator for hooking into the `lit-html-element` property system.

When using the property decorator you don't need to define the static properties accessor ```static get properties()```.

When using property decorators any such static property accessor will be ignored, and you don't need to call ```.withProperties()``` either.

```typescript
@property({type: String})
myProperty: string;
```

Check [Extensions for TypeScript](#extensions-for-typescript) for more info.

### `@attribute(USVString attrName)`

A property decorator for hooking into the `lit-html-element` property system and associating a property with a custom element attribute.

Check [The `attrName` property](#the-attrname-property) for more info.

### `@computed(any dependency1, any dependency2, ...)`

A property decorator for hooking into the `lit-html-element` property system and create a property auto-computed from other properties.

Check [The `computed` property](#the-computed-property) for more info.

### `@listen(USVString eventName, (USVString or EventTarget) target)`

A method decorator for adding an event listener. You can use a string for target and it will search for an element in the shadowRoot with that `id`.

Event listeners are added after the first rendering, which creates the shadow DOM.