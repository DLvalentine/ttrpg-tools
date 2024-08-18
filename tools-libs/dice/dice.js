import _ from 'lodash'; // mainly for random and remove - just wish vanilla js was better

/**
 * Roll di(c)e, and return formatted string(s) containing data about the roll(s)
 * @param formattedArg {Object} - contains information about the dice from the argument string
 * @param returnTotal {Boolean} - Defaults to false. If true, returns ONLY the total of the roll as a string.
 * @return {String} - formatted message
 */
const roll = (formattedArg, returnTotal = false) => {
    const rolls = new Array(formattedArg.quantity).fill(0);
    let total = 0;
    
    rolls.forEach((_value, index) => {
        rolls[index] = _.random(1, formattedArg.type);
    });

    total = rolls.reduce((r, v) => r+=v) - formattedArg.penalty + formattedArg.bonus;

    if(returnTotal) {
        return `${total}`;
    } else {
        let returnMessages = [
            `Dice String: ${formattedArg.quantity}d${formattedArg.type}`,
            `Your roll had a penalty of ${formattedArg.penalty}\nYour roll had a bonus of ${formattedArg.bonus}`,
            `Indv. Roll Results: [ ${rolls.join(', ')} ] ${formattedArg.penalty ? `- ${formattedArg.penalty}` : ''} ${formattedArg.bonus ? `+ ${formattedArg.bonus}` : ''}`,
            `Total: ${total}`
        ];
    
        if(!formattedArg.penalty && !formattedArg.bonus) { 
             _.remove(returnMessages, (_value, index) => { // I wish this were simpler in js :| it was either this or splice
                    return index === 1;
            });
        }
    
        return(returnMessages.join('\n\n'));
    }
};

/**
 * Calls `roll` but returns just the total as a numeric value.
 * @param formattedArg {Object} - contains information about the dice from the argument string
 * @returns {Integer} - total of the roll with modifiers applied
 */
const rollNumeric = formattedArg => {
    return parseInt(roll(formattedArg, true), 10);
};

/**
 * Format user input from dice string into object for rolling
 * @param argument {String} - a dice string formatted with [quantity]d[type][+bonuses or -penalties]
 * @return {Object} - containing data about the roll
 */
const format = argument => {
    let arg = argument.toLowerCase().replace(/\s/g, ''); // Just ensure that whitespace is replaced, since it is cheap.
    if ( arg[0] === 'd' ) arg = '1' + arg; // to make life easier, prepend 1 when no quantity provided
    let splitArgs = arg.split('d');

    return {
        quantity: parseInt(splitArgs[0], 10),
        type: parseInt(splitArgs[1].split(/[+-]/g)[0], 10) || 0,
        penalty: parseInt(splitArgs[1].split(/[-]/g)[1], 10) || 0,
        bonus: parseInt(splitArgs[1].split(/[+]/g)[1], 10) || 0,
    };
}

const dice = {roll, rollNumeric, format};
export default dice;
