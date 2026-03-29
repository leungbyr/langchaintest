import React, { useState } from "react";
import { render, Text } from "ink";
import TextInput from 'ink-text-input';

const Main = () => {
    const [input, setInput] = useState('');

    const handleSubmit = (value: string) => {
        setInput('')
    };

    return (
        <>
            <Text color="green">Hello, welcome to Byron Code</Text>
            <Text>What code would you like to debug?</Text>
            <TextInput value={input} onChange={setInput} onSubmit={handleSubmit}/>
        </>
    );
};

render(<Main />);
