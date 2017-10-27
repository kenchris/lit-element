import { TemplateResult } from '../node_modules/lit-html/lit-html.js';
export { html } from '../node_modules/lit-html/lib/lit-extended.js';
export interface PropertyDeclaration {
    type: any;
    value?: any;
    attrName?: string;
}
export declare class LitElement extends HTMLElement {
    private _needsRender;
    private _lookupCache;
    private _values;
    static readonly properties: PropertyDeclaration[];
    static readonly observedAttributes: string[];
    constructor();
    static withProperties(): typeof LitElement;
    renderCallback(): TemplateResult;
    attributeChangedCallback(prop: string, _oldValue: string, newValue: string): void;
    connectedCallback(): void;
    invalidate(): void;
    $(id: string): any;
}
