export const convertArrayToObject = (array, key) => {
    const initialValue = {};
    return array.reduce((obj, item, index) => {
        let _newobj = Object.assign({}, item);
        delete _newobj.id;
        return {
            ...obj,
            [typeof key == 'undefined' ? index : item[key]]: _newobj
        };
    }, initialValue);
};


export function isEmptyObject(obj) {
    return !Object.keys(obj).length;
  }
  
export const my_secret = 'zaki 2020'; // fot SimpleCrypto