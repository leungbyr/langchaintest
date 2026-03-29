import React, { useState } from "react";
import { render, Text } from "ink";
import TextInput from "ink-text-input";
import { FilePicker } from "./FilePicker.js";

const Main = () => {
    const [input, setInput] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const handleSubmit = () => {
        setInput("");
    };

    return (
        <>
            <Text color="green">Hello, welcome to Byron Code</Text>
            <Text>What code would you like to debug?</Text>
            {selectedFile ? (
                <>
                    <Text color="cyan">File: {selectedFile}</Text>
                    <TextInput
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        focus
                    />
                </>
            ) : (
                <FilePicker onSelectFile={setSelectedFile} />
            )}
        </>
    );
};

render(<Main />);
