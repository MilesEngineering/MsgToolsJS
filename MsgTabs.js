/*
 * A crude approximation of a tab widget:
 * A container with a row of buttons at the top. When a button is clicked, only the
 * child at the same index as the button is shown, all other children are hidden.
 */
if (typeof MsgTabs !== "undefined") {
    console.log('MsgTabs already loaded')
} else {

class MsgTabs extends HTMLElement {
    constructor() {
        super();

        this.tabNames = this.getAttribute('tabNames').split(',');
        var computed_style = getComputedStyle(this);
        var baseStyle = `padding: var(--tab-padding, 0);
                         display: var(--tab-display, flex);
                         margin: var(--tab-margin, 0px);
                         font-family: var(--main-font, sans-serif);
                        `
        var wrapperStyle = `padding: var(--wrapper-padding, 30px 45px);
                            border: var(--wrapper-border, 1px solid #222831);
                            font-family: var(--main-font, sans-serif);
                            font-size: var(--base-font-size, 18px);
                            background-color: var(--tab-background-hover, --color-dark-contrast, white);
                            border-radius: var(--wrapper-radius, 0 4px 4px 4px);
                           `
        if(this.hasAttribute("style")) {
            var inline_style = this.getAttribute("style");
            if(inline_style.replace(' ','').includes('border:')) {
                baseStyle = inline_style+";";
            } else {
                baseStyle = inline_style+";"+baseStyle;
            }
            var computed_style = getComputedStyle(this);
            var computed_property = computed_style.getPropertyValue('border');
            if(computed_property) {
                if(computed_property == "0px none rgb(0, 0, 0)"){
                }
            }
            // This is weird but if the MsgTabs has a style, the browsers adds stubby vertical lines
            // above and below it, and they look weird.  Clearing the style here but putting it on
            // the children makes it look ok.
            // this.setAttribute('style', '');
        }
        this.tabButtons = [];
        var buttonContainer = document.createElement('div');
        buttonContainer.setAttribute('class', 'button-container');
        buttonContainer.setAttribute('style', baseStyle);
        this.insertBefore(buttonContainer, this.firstChild);
        for(var tab=0; tab<this.tabNames.length; tab++) {
            var tabBtn = document.createElement('input');
            tabBtn.setAttribute('type', 'button');
            tabBtn.setAttribute('value', this.tabNames[tab]);
            tabBtn.onclick = this.tabClicked.bind(this, tab);
            buttonContainer.appendChild(tabBtn);
            this.tabButtons.push(tabBtn);
            var childNumber = tab+1;
            var wrapper = this.children[childNumber];
            wrapper.baseStyle = wrapperStyle + wrapper.getAttribute('style');
            wrapper.setAttribute('class', 'wrapper');
        }
        this.tabButtonStyle =
            `background-color: var(--color-dark-contrast-2, #eeeeee);
             border: var(--tab-button-border, 1px solid #222831);
             border-top: var(--tab-button-border-top, 1px solid #222831);
             border-bottom: var(--tab-button-border-bottom, 1px solid black);
             margin: var(--tab-button-margin, 0 4px -1px 0);
             outline: var(--tab-button-outline, none);
             cursor: pointer;
             padding: var(--tab-button-padding, 14px 16px);
             transition: var(--tab-button-transition, all 0.3s);
             color: var(--tab-color, #222831);
             font-size: var(--base-font-size, 18px);
             font-weight: var(--main-font-weight, regular);
             border-radius: var(--border-radius, 4px 4px 0 0);
             font-family: var(--main-font, sans-serif);
             box-sizing: border-box;
             text-transform: var(--header-text-transform, uppercase);
             letter-spacing: var(--header-text-letter-spacing, .035em);
             `
        this.tabClicked(0);
    }
    tabClicked(tab) {
        for(var i=0; i<this.tabNames.length; i++) {
            this.show(i, i == tab);
        }
    }
    show(tab, s) {
        var showString = "none";
        var tabButtonStyle = this.tabButtonStyle;
        if(s) {
            showString = "block";
            tabButtonStyle += `background-color: var(--tab-background-hover, white);
                               border-top: var(--tab-button-border-hover, 4px solid #d65a31);
                               padding: var(--tab-button-padding-hover, 11px 16px 15px);
                               border-bottom: 0;
                              `;
        } else {
        }
        var style = "; display: " + showString;
        var childNumber = tab+1;
        var child = this.children[childNumber];
        child.setAttribute('style', child.baseStyle + style);
        this.tabButtons[tab].setAttribute('style', tabButtonStyle);
    }
}

customElements.define('msgtools-tabs', MsgTabs);
}
