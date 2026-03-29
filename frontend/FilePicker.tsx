import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

type BrowserItem =
    | { kind: "parent" }
    | { kind: "dir"; name: string }
    | { kind: "file"; name: string };

function canAscendFrom(dir: string): boolean {
    const parent = resolve(dir, "..");
    return resolve(parent) !== resolve(dir);
}

type ListDirResult =
    | { ok: true; items: BrowserItem[] }
    | { ok: false; reason: "read_error" };

function listDirEntries(dir: string): ListDirResult {
    try {
        const entries = readdirSync(dir, { withFileTypes: true }).filter(
            (e) => !e.name.startsWith(".")
        );
        const dirs = entries
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b));
        const files = entries
            .filter((e) => e.isFile())
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b));

        const items: BrowserItem[] = [];
        if (canAscendFrom(dir)) {
            items.push({ kind: "parent" });
        }
        for (const name of dirs) {
            items.push({ kind: "dir", name });
        }
        for (const name of files) {
            items.push({ kind: "file", name });
        }
        return { ok: true, items };
    } catch {
        return { ok: false, reason: "read_error" };
    }
}

function itemLabel(item: BrowserItem): string {
    if (item.kind === "parent") return "..";
    if (item.kind === "dir") return `${item.name}/`;
    return item.name;
}

// ---------------------------------------------------------------------------
// GridPicker — multi-column file grid with arrow-key navigation
// ---------------------------------------------------------------------------

const COL_GAP = 2;
const OVERHEAD_ROWS = 5; // rows consumed by dir path, hints, etc.

type GridItem = { label: string; value: BrowserItem };

function GridPicker({
    items,
    onSelect,
}: {
    items: GridItem[];
    onSelect: (item: BrowserItem) => void;
}) {
    const { stdout } = useStdout();
    const termWidth = stdout?.columns ?? 80;
    const termRows = stdout?.rows ?? 24;

    const nRows = Math.max(1, Math.min(items.length, termRows - OVERHEAD_ROWS));
    const nCols = Math.ceil(items.length / nRows);

    const colWidths: number[] = useMemo(() => {
        return Array.from({ length: nCols }, (_, c) => {
            let max = 0;
            for (let r = 0; r < nRows; r++) {
                const idx = c * nRows + r;
                if (idx < items.length) {
                    max = Math.max(max, items[idx].label.length);
                }
            }
            return max;
        });
    }, [items, nRows, nCols]);

    const [cursor, setCursor] = useState({ row: 0, col: 0 });
    const [vpStart, setVpStart] = useState(0);

    // Reset cursor whenever the directory changes (items reference changes)
    useEffect(() => {
        setCursor({ row: 0, col: 0 });
        setVpStart(0);
    }, [items]);

    // Returns the column indices visible starting from `start`
    function visColsFrom(start: number): number[] {
        const cols: number[] = [];
        let used = 0;
        for (let c = start; c < nCols; c++) {
            const w = colWidths[c] + (cols.length > 0 ? COL_GAP : 0);
            if (cols.length > 0 && used + w > termWidth) break;
            cols.push(c);
            used += w;
        }
        return cols;
    }

    // Find the vpStart that keeps `col` visible, shifting left if needed
    function vpStartForCol(col: number, current: number): number {
        const vis = visColsFrom(current);
        if (vis.includes(col)) return current;
        if (col < current) return col;
        // col is to the right — find the rightmost start that fits col as last
        let start = col;
        let used = colWidths[col];
        while (start > 0) {
            const prevW = colWidths[start - 1] + COL_GAP;
            if (used + prevW > termWidth) break;
            start--;
            used += prevW;
        }
        return start;
    }

    useInput((_input, key) => {
        let { row, col } = cursor;

        if (key.upArrow) {
            row = Math.max(0, row - 1);
        } else if (key.downArrow) {
            const itemsInCol = Math.min(nRows, items.length - col * nRows);
            row = Math.min(itemsInCol - 1, row + 1);
        } else if (key.leftArrow) {
            if (col > 0) {
                col -= 1;
                const itemsInCol = Math.min(nRows, items.length - col * nRows);
                row = Math.min(row, itemsInCol - 1);
            }
        } else if (key.rightArrow) {
            if (col < nCols - 1) {
                col += 1;
                const itemsInCol = Math.min(nRows, items.length - col * nRows);
                row = Math.min(row, itemsInCol - 1);
            }
        } else if (key.return) {
            const idx = col * nRows + row;
            if (idx < items.length) {
                onSelect(items[idx].value);
            }
            return;
        } else {
            return;
        }

        setCursor({ row, col });
        setVpStart((vs) => vpStartForCol(col, vs));
    });

    const visCols = useMemo(() => visColsFrom(vpStart), [vpStart, nCols, colWidths, termWidth]);
    const hasLeft = vpStart > 0;
    const hasRight =
        visCols.length > 0 && visCols[visCols.length - 1] < nCols - 1;

    return (
        <Box flexDirection="row" alignItems="flex-start">
            <Text color="yellow">{hasLeft ? "◀ " : "  "}</Text>
            {visCols.map((c) => (
                <Box
                    key={c}
                    flexDirection="column"
                    marginRight={COL_GAP}
                >
                    {Array.from({ length: nRows }, (_, r) => {
                        const idx = c * nRows + r;
                        if (idx >= items.length) {
                            return (
                                <Text key={r}>
                                    {" ".repeat(colWidths[c])}
                                </Text>
                            );
                        }
                        const item = items[idx];
                        const isSelected =
                            c === cursor.col && r === cursor.row;
                        const isDir =
                            item.value.kind === "dir" ||
                            item.value.kind === "parent";
                        return (
                            <Text
                                key={r}
                                bold={isDir}
                                color={
                                    isSelected
                                        ? "black"
                                        : isDir
                                          ? "blue"
                                          : undefined
                                }
                                backgroundColor={
                                    isSelected ? "cyan" : undefined
                                }
                            >
                                {item.label.padEnd(colWidths[c])}
                            </Text>
                        );
                    })}
                </Box>
            ))}
            <Text color="yellow">{hasRight ? " ▶" : ""}</Text>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// FilePicker
// ---------------------------------------------------------------------------

export type FilePickerProps = {
    initialDir?: string;
    onSelectFile: (absolutePath: string) => void;
};

export function FilePicker({
    initialDir = process.cwd(),
    onSelectFile,
}: FilePickerProps) {
    const [currentDir, setCurrentDir] = useState(initialDir);
    const [fallbackInput, setFallbackInput] = useState("");

    const dirListing = useMemo(() => listDirEntries(currentDir), [currentDir]);
    const gridItems: GridItem[] = useMemo(
        () =>
            dirListing.ok
                ? dirListing.items.map((item) => ({
                      label: itemLabel(item),
                      value: item,
                  }))
                : [],
        [dirListing]
    );

    const handleSelect = (item: BrowserItem) => {
        if (item.kind === "parent") {
            setCurrentDir(resolve(currentDir, ".."));
            return;
        }
        if (item.kind === "dir") {
            setCurrentDir(join(currentDir, item.name));
            return;
        }
        onSelectFile(join(currentDir, item.name));
    };

    if (dirListing.ok === false) {
        return (
            <>
                <Text dimColor>Cannot read folder: {currentDir}</Text>
                <Text dimColor>Enter a path:</Text>
                <TextInput
                    value={fallbackInput}
                    onChange={setFallbackInput}
                    onSubmit={() => setFallbackInput("")}
                    focus
                />
            </>
        );
    }

    if (gridItems.length === 0) {
        return (
            <>
                <Text dimColor>Folder is empty: {currentDir}</Text>
                <Text dimColor>Enter a path:</Text>
                <TextInput
                    value={fallbackInput}
                    onChange={setFallbackInput}
                    onSubmit={() => setFallbackInput("")}
                    focus
                />
            </>
        );
    }

    return (
        <Box flexDirection="column">
            <Text dimColor>{currentDir}</Text>
            <Text dimColor>
                ↑↓ row · ←→ column · Enter: open/select
            </Text>
            <GridPicker items={gridItems} onSelect={handleSelect} />
        </Box>
    );
}
