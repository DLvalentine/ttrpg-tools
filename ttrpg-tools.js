// TODO: Would be nice to have mythic gme tools as their own lib. 
// TODO: same as above, but with other tools like UNE.

import {default as pdfConverter} from 'pdf-poppler'

import * as readline from 'node:readline';
import {stdin as input, stdout as output} from 'node:process';
let rl = readline.createInterface({ input, output, prompt: '>' }); // TODO > prompt, history would be nice to have (prompt doesn't seem to work here?)

import config from './config.json' with { type: 'json' };

import dice from './tools-libs/dice/dice.js';
import randomTables from './tools-libs/random-tables/random-tables.js';

/**
 * TOOL CODE (for tools that live here and not somewhere else, like the dice code (dice.js))
 * ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 */

// Given a pdf page, convert it to jpg and output to destination. I use this mostly to take battlemaps from rpg supplements
// and convert them to jpegs I can use on my VTTs. Might be able to use this with other sources, too, eventually. Works best with
// "full page" content, and not something I could ctrl+c/v into paint or something
function pdfPageToJpeg(system, sourcebookFilename, page, dest = config.destPath) {
    if(!config.systems[system]) {
        console.log(`System not configured: ${system} - see config.json, and ensure directories are set up correctly.`);
        return;
    }

    // FIXME: we should check to make sure this file exists before continuing
    const pdfPath = `${config.originPath}${config.systems[system]}${sourcebookFilename}`;

    let option = {
        format: 'jpeg',
        out_dir: dest,
        out_prefix: `${system}-${sourcebookFilename}`,
        scale: 4096,
        page
    };

    pdfConverter.convert(pdfPath, option)
    .catch((err) => {
        console.log(`PDF Conversion Error: ${err}`)
    });

    // 'probably' because I've gotten this message once when the pdfPath didn't exist lol
    // FIXME: see above
    // TODO: 9 times out of 10 I want to open or view the file after generating it, maybe have explorer open when we're done? or ask user if they want that?
    console.log(`\nSuccess (probably)! New asset located in directory: ${dest}`);
};

/**
 * CLI Code (spaghetti central mfer) -> main_menu() called at EOF
 * ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 */

function main_menu() {
    console.log('\n::RPG TOOLS::\n');
    rl.question('Type an option and press ENTER:\n • [1] pdfPageToJpeg - For converting battlemaps for VTTs mostly\n • [2] Dice Roller - Takes a dice string (e.g. 2d8+10) and rolls, returning the result\n • [3] Random Tables - Roll against a random table and get its result\n • E[x]it\n', opt => {
        switch(opt) {
            case '1':
                console.clear();
                tool_PdfPageToJpeg();
                break;
            case '2':
                console.clear();
                tool_diceRoller();
                break;
            case '3':
                console.clear();
                tool_randomTables();
                break;
            case 'x':
                console.clear();
                flush(false);
                break;
            case 'c':
            default:
                flush();
                console.clear();
                main_menu();
                break;
        }
    });
};

/**
 * Calls pdfPageToJpeg, but gathers information from the user first
 * Goes back to main menu when done (no looping, usually just wanna use it once)
 */
function tool_PdfPageToJpeg() {
    let system, sourcebookFilename, page;

    const supportedSystems = Object.keys(config.systems).map((system, idx) => {
        return `• [${idx+1}] ${system}\n`;
    }).join(' ');

    rl.question(`\nWhich system?\n ${supportedSystems}`, sys => {
        system = Object.keys(config.systems)[sys-1];
        rl.question('\nEnter the filename of your sourcebook WITH extension:\n', srcbkPath => {
            sourcebookFilename = srcbkPath;
            rl.question('\nWhich page should be converted?\n', pg => {
                page = parseInt(pg, 10);
                flush();
                pdfPageToJpeg(system, sourcebookFilename, page);
                main_menu();
            });
        });
    });
}

/**
 * Gathers information from the user, then uses dice.js that I wrote to roll some dice.
 * Will keep running until a user quits, then goes back to main menu.
 * FIXME: If you just hit ENTER on this menu it closes the app lmao, probably because I don't have us return to the main menu or whatever
 */
function tool_diceRoller() {
    rl.question('\nEnter a dice string and press ENTER or E[x]it:\n', str => {
        if(str.length && str !== 'x' && str !== 'c') {
            try {
                console.log('\n' + dice.roll(dice.format(str)));
            } catch(_){};
            flush();
            tool_diceRoller();
        } else {
            switch(str) {
                case 'x':
                    flush();
                    console.clear();
                    main_menu();
                break;
                case 'c':
                default:
                    flush();
                    console.clear();
                    tool_diceRoller();
                break;
            }
        }
    });
};

/**
 * From the loaded random tables, ask user to select a random table and roll against it, returning the results
 * Will keep running until a user quits, then goes back to main menu. Gives user the option to select a different table.
 */
function tool_randomTables() {
    console.log('\nTables:');
    Object.values(randomTables.tables).forEach((table, idx) => {
        console.log(`[${idx + 1}] ${table.info.name}: ${table.info.description}`);
    });

    rl.question('\nSelect a table from above to roll against and press ENTER or E[x]it:\n', str => {
        if(str.length && str !== 'x' && str !== 'c') {
            try {
                const selectedTableIDX = parseInt(str, 10) - 1;
                console.clear();
                console.log(`Rolling against ${Object.values(randomTables.tables)[selectedTableIDX].info.name}...`);
                console.log(randomTables.rollTable(Object.values(randomTables.tables)[selectedTableIDX]));
            } catch(_){};
            flush();
            tool_randomTables();
        } else {
            switch(str) {
                case 'x':
                    flush();
                    console.clear();
                    main_menu();
                    break;
                case 'c':
                default:
                    flush();
                    console.clear();
                    tool_randomTables();
                break;
            }
        }
    });
};

// I use the term flush here VERY loosely
// Basically closing readline so program can continue, then creating a new one for use later (unless we no longer need it, then set reopen to false)
// I would clear the console here, but we might not always want that - leaving it up to the tools to decide before calling this.
function flush(reopen = true) {
    rl.close();
    if(reopen)
        rl = readline.createInterface({ input, output, prompt: '>' });
}

// HACK : Suppress warnings from Node. I think it is bothering me about my usage of readline but eh
setTimeout(() => {
    console.clear();
    // Start da program
    main_menu();
});
