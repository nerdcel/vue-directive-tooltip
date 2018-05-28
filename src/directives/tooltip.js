import Utils from 'popper.js/dist/popper-utils';
import Popper from 'popper.js';

const BASE_CLASS = 'h-tooltip';
const PLACEMENT = ['top', 'left', 'right', 'bottom', 'auto'];

const EVENTS = {
    ADD: 1,
    REMOVE: 2
};

const DEFAULT_OPTIONS = {
    container: false,
    delay: 200,
    instance: null, // the popper.js instance
    eventsEnabled: true,
    html: false,
    inlineHtml: false,
    modifiers: {
        arrow: {
            element: '.tooltip-arrow'
        }
    },
    placement: 'auto',
    placementPostfix: null, // start | end
    removeOnDestroy: true,
    title: '',
    class: '', // ex: 'tooltip-custom tooltip-other-custom'
    triggers: ['hover', 'focus'],
    offset: 5
};

export default class Tootlip {
    constructor (el, options = {}) {
        Tootlip._defaults = DEFAULT_OPTIONS;
        this._options = {
            ...Tootlip._defaults,
            ...{
                onCreate: (data) => {
                    this.content(this.tooltip.options.title);
                    this._$tt.update();
                },
                onUpdate: (data) => {
                    this.content(this.tooltip.options.title);
                    this._$tt.update();
                }
            },
            ...Tootlip.filterOptions(options)
        };

        const $tpl = this._createTooltipElement(this.options);
        document.querySelector('body').appendChild($tpl);

        this._$el = el;
        this._$tt = new Popper(el, $tpl, this._options);
        this._$tpl = $tpl;
        this._visible = false;
        this._clearDelay = null;
        this._setEvents();
    }

    destroy () {
        this._cleanEvents();
        document.querySelector('body').removeChild(this._$tpl);
    }

    get options () {
        return {...this._options};
    }

    get tooltip () {
        return this._$tt;
    }

    _createTooltipElement (options) {
        // wrapper
        let $popper = document.createElement('div');
        $popper.setAttribute('id', `tooltip-${randomId()}`);
        $popper.setAttribute('class', `${BASE_CLASS} ${this._options.class}`);
        Utils.setStyles($popper, {display: 'none'});

        // make arrow
        let $arrow = document.createElement('div');
        $arrow.setAttribute('class', 'tooltip-arrow');
        $arrow.setAttribute('x-arrow', '');
        $popper.appendChild($arrow);

        // make content container
        let $content = document.createElement('div');
        $content.setAttribute('class', 'tooltip-content');
        $popper.appendChild($content);

        return $popper;
    }

    _events (type = EVENTS.ADD) {
        const evtType = (type === EVENTS.ADD) ? 'addEventListener' : 'removeEventListener';
        if (!Array.isArray(this.options.triggers)) {
            console.error('trigger should be an array', this.options.triggers);
            return;
        }

        let lis = (...params) => this._$el[evtType](...params);

        if (this.options.triggers.includes('manual')) {
            lis('click', this._onToggle.bind(this), false);
        } else {
            this.options.triggers.map(evt => {
                switch (evt) {
                case 'click':
                    lis('click', this._onToggle.bind(this), false);
                    document[evtType]('click', this._onDeactivate.bind(this), false);
                    break;
                case 'hover':
                    lis('mouseenter', this._onActivate.bind(this), false);
                    lis('mouseleave', this._onDeactivate.bind(this), true);
                    break;
                case 'focus':
                    lis('focus', this._onActivate.bind(this), false);
                    lis('blur', this._onDeactivate.bind(this), true);
                    break;
                }
            });

            if (this.options.triggers.includes('hover') || this.options.triggers.includes('focus')) {
                this._$tpl[evtType]('mouseenter', this._onMouseOverTooltip.bind(this), false);
                this._$tpl[evtType]('mouseleave', this._onMouseOutTooltip.bind(this), false);
            }
        }
    }

    _setEvents () {
        this._events();
    }

    _cleanEvents () {
        this._events(EVENTS.REMOVE);
    }

    _onActivate (e) {
        this.show();
    }

    _onDeactivate (e) {
        this.hide();
    }

    _onToggle (e) {
        e.stopPropagation();
        e.preventDefault();
        this.toggle();
    }

    _onMouseOverTooltip (e) {
        this.toggle(true, false);
    }

    _onMouseOutTooltip (e) {
        this.toggle(false);
    }

    content (content) {
        const wrapper = this.tooltip.popper.querySelector('.tooltip-content');
        if (typeof content === 'string') {
            wrapper.innerHTML = '';
            wrapper.appendChild(content);
        } else if (isElement(content)) {
            if (content !== wrapper.children[0]) {
                wrapper.innerHTML = '';
                wrapper.appendChild(content);
            }
            // var clonedNode = content.cloneNode(true);
            // this.tooltip.options.title = clonedNode;
            // if (isElement(content.parentNode)) {
            //     content.parentNode.removeChild(content);
            // }
        } else {
            console.error('unsupported content type', content);
        }
    }

    static filterOptions (options) {
        let opt = {...options};

        opt.modifiers = {};
        opt.placement = PLACEMENT.includes(options.placement) ? options.placement : 'auto';

        opt.modifiers.offset = {
            fn: Tootlip._setOffset
        };

        return opt;
    }

    static _setOffset (data, opts) {
        let offset = data.instance.options.offset;

        if (window.isNaN(offset) || offset < 0) {
            offset = Tootlip._defaults.offset;
        }

        switch (data.placement) {
        case 'top': data.offsets.popper.top -= offset; break;
        case 'right': data.offsets.popper.left += offset; break;
        case 'bottom': data.offsets.popper.top += offset; break;
        case 'left': data.offsets.popper.left -= offset; break;
        }

        return data;
    }

    static defaults (data) {
        Tootlip._defaults = {...Tootlip._defaults, ...data};
    }

    show () {
        this.toggle(true);
    }

    hide () {
        this.toggle(false);
    }

    toggle (visible, autoHide = true) {
        let delay = this._options.delay;

        if (typeof visible !== 'boolean') {
            visible = !this._visible;
        }

        if (visible === true) {
            delay = 0;
        }

        clearTimeout(this._clearDelay);

        if (autoHide === true) {
            this._clearDelay = setTimeout(() => {
                this._visible = visible;
                this._$tt.popper.style.display = (this._visible === true) ? 'inline-block' : 'none';
                this._$tt.update();
            }, delay);
        }
    }
}

Tootlip._defaults = DEFAULT_OPTIONS;

function randomId () {
    return `${Date.now()}-${Math.round(Math.random() * 100000000)}`;
}

/**
 * Check if the variable is an html element
 * @param {*} value
 * @return Boolean
 */
function isElement (value) {
    return value instanceof window.Element;
}
