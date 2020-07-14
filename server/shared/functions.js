const replaceStringArray = (stringArray, string) => {
    let newString = string

    if(string){
        stringArray.map(string => {
            newString = newString.replace(string.regExp, string.wordReplaced)
        })
    }

    return newString
}

module.exports = {
    replaceStringArray
}