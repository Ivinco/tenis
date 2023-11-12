import {useEffect, useState} from "react";

export const useValidation = (value, validations) => {
    const [isEmpty, setIsEmpty] = useState(true)
    const [minLength, setMinLengh] = useState(false)
    const [maxLength, setMaxLength] = useState(false)
    const [isValid, setIsValid] = useState(false)

    useEffect(() => {
        for (const validation in validations){
            switch (validation) {
                case "minLength" :
                    value.length > 0 && value.length < validations[validation]
                    ? setMinLengh( true)
                        : setMinLengh( false)
                    break
                case "maxLength":
                    value.length > validations[validation]
                        ? setMaxLength(true)
                        : setMaxLength(false)
                    break
                case 'isEmpty':
                    value ? setIsEmpty(false) : setIsEmpty(true)
                    break
            }
        }
    }, [value]);
    useEffect(() => {
        (isEmpty || minLength || maxLength) ? setIsValid(false) : setIsValid(true)
    }, [isEmpty, minLength, maxLength]);

    return {
        isEmpty,
        minLength,
        maxLength,
        isValid
    }
}

export const useInput = (initValue, validations) => {
    const [value, setValue] = useState(initValue)
    const [isDirty, setIsDirty] = useState(false)

    const valid = useValidation(value, validations)

    const onChange = (e) => {
        setValue(e.target.value)
    }
    const onBlur = (e) => {
        setIsDirty(true)
    }
    const reset = (value) => {
        setValue(value)
    }
    const clean = () => {
        setIsDirty(false)
    }
    return {
        value,
        onChange,
        onBlur,
        isDirty,
        reset,
        clean,
        ...valid
    }
}