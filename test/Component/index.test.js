import PuppeteerBrowser from 'puppeteer-browser';

import { delay } from 'dom-renderer';


var page;

function consoleText() {

    return  new Promise(resolve =>
        page.on('console',  message => resolve( message.text() ))
    );
}


/**
 * @test {Component}
 */
describe('Component mixin',  () => {

    before(async ()  =>
        page = await PuppeteerBrowser.getPage('', 'test/Component/')
    );

    /**
     * @test {component}
     * @test {Component.tagName}
     */
    it('Define Custom element',  () =>

        page.$eval('cell-test',  element => [
            element.constructor.name,
            element.constructor.template
        ]).should.be.fulfilledWith([
            'CellTest',
            `<style>
        textarea {
            font-style: italic;
        }</style><textarea onchange="\${host.trigger.bind( host )}">            Hello, \${view.name}!
        </textarea>`
        ])
    );

    /**
     * @test {Component#construct}
     */
    it('Build Shadow DOM',  () =>

        page.$eval('cell-test',  element => {

            const box = element.$('textarea')[0];

            return Array.from(
                element.shadowRoot.children,  element => element.tagName
            ).concat(
                box.value.trim(),  getComputedStyle( box ).fontStyle
            );
        }).should.be.fulfilledWith([
            'STYLE',  'TEXTAREA',  'Hello, Web components!', 'italic'
        ])
    );

    /**
     * @test {loadDOM}
     */
    it('Load nested Component',  () =>

        page.$eval('cell-main',  tag => {

            tag = tag.shadowRoot.firstChild;

            return tag.ready.constructor.name;

        }).should.be.fulfilledWith('Promise')
    );

    /**
     * @test {Component#connectedCallback}
     */
    it('Inject Shared state',  () =>

        page.$eval('cell-main',  tag => {

            tag = tag.shadowRoot.firstChild;

            return tag.store;

        }).should.be.fulfilledWith({test: 'example'})
    );

    /**
     * @test {mapProperty}
     */
    it('Map Attribute to Property',  async () => {

        await page.$eval(
            'cell-test',  element => element.setAttribute('value', 'example')
        );

        (await page.$eval('cell-test',  element => element.value))
            .should.be.equal('example');
    });

    /**
     * @test {mapData}
     */
    it('Map Property to Data',  async () => {

        await page.$eval('cell-test',  element => element.name = 'WebCell');

        await delay(0.05);

        (await page.$eval(
            'cell-test',
            element  =>  element.$('textarea')[0].textContent.trim()
        )).should.be.equal(
            'Hello, WebCell!'
        );
    });

    /**
     * @test {Component#on}
     */
    it('Get the event target in Shadow DOM',  async () => {

        const input = consoleText();

        await page.focus('cell-test');

        await page.$eval('cell-test',  element => element.value = '');

        await page.type('cell-test', 'test');

        (await input).should.be.equal('CELL-TEST TEXTAREA');
    });

    /**
     * @test {trigger}
     */
    it('Dispatch events out of Shadow DOM',  async () => {

        const changed = consoleText();

        await page.click('body');

        (await changed).should.be.equal('test');
    });

    /**
     * @test {delegate}
     */
    it('Delegate DOM events',  async () => {

        const input = consoleText();

        await page.$eval('body',  body => body.addEventListener(
            'focusin', self['web-cell'].delegate(
                'textarea',
                function ({ type }) {  console.info(this.tagName, type);  }
            )
        ));

        await page.click('cell-test');

        (await input).should.be.equal('TEXTAREA focusin');
    });
});


describe('Form field components',  () => {
    /**
     * @test {InputComponent#changedPropertyOf}
     * @test {watchAttributes}
     */
    it('Render inner field',  async () => {

        const property = await page.$eval('cell-input',  input => {

            const cursor = input.style.getPropertyValue('--input-cursor');

            input = input.shadowRoot.children[0];

            return {
                type:         input.type,
                value:        input.value,
                readOnly:     input.readOnly,
                placeholder:  input.placeholder,
                cursor
            };
        });

        property.should.be.eql({
            type:         'text',
            value:        '1',
            readOnly:     true,
            placeholder:  'test',
            cursor:       'default'
        });
    });


    it('Filter some data',  async () => {

        const message = consoleText();

        await page.$eval(
            'cell-input input',
            input  =>  input.setAttribute('value', 'wrong')
        );

        (await message).should.be.equal('Something goes wrong!');

        (await page.$eval('cell-input',  input => input.$('input')[0].value))
            .should.be.equal('1');
    });

    /**
     * @test {on}
     */
    it('Auto event listener',  async () => {

        const message = consoleText();

        (await page.$eval(
            'cell-input',
            input => self['web-cell'].trigger(
                input.$('input')[0],  'test',  {example: 'sample'},  true,  true
            )
        )).should.be.false();

        (await message).should.be.equal('CustomEvent INPUT sample');
    });

/*
    it('Update outer field while typing',  async () => {

        var proxy = await page.$('cell-input');

        proxy = await proxy.getProperty('shadowRoot');

        proxy = await proxy.$('input');

        await proxy.type('Hello, WebCell !');

        (await page.$eval('cell-input input',  input => input.value))
            .should.be.equal('Hello, WebCell !');
    });*/
});
