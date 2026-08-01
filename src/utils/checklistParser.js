const MAX_INDENT_LEVEL = 3;

function readLine(line) {
    const expanded = line.replace(/\t/g, '    ');
    const leadingSpaces = expanded.match(/^ */)?.[0].length ?? 0;
    let content = expanded.trimStart();
    let markerType = null;
    let markerDepth = 0;

    const jiraHeading = content.match(/^(#{1,6})\s+/);
    if (jiraHeading) {
        markerType = 'jira';
        markerDepth = jiraHeading[1].length - 1;
        content = content.slice(jiraHeading[0].length);
    } else {
        const ordered = content.match(
            /^(\d+(?:\.\d+)*|[A-Za-z])(?:[.)])\s+/,
        );
        if (ordered) {
            markerType = /^\d/.test(ordered[1]) ? 'number' : 'letter';
            markerDepth = markerType === 'number'
                ? ordered[1].split('.').length - 1
                : 0;
            content = content.slice(ordered[0].length);
        } else {
            const bullet = content.match(/^(?:[-*+•◦▪‣–—])\s+/);
            if (bullet) {
                markerType = 'bullet';
                content = content.slice(bullet[0].length);
            }
        }
    }

    let checked = false;
    const checkbox = content.match(/^\[([ xX])]\s*/);
    if (checkbox) {
        checked = checkbox[1].toLowerCase() === 'x';
        content = content.slice(checkbox[0].length);
    }

    return {
        checked,
        content: content.trim(),
        leadingSpaces,
        markerDepth,
        markerType,
    };
}

function getIndentRank(leadingSpaces, indentationColumns) {
    if (leadingSpaces === 0) return 0;

    let rank = 0;
    for (const column of indentationColumns) {
        if (leadingSpaces < column) break;
        rank += 1;
    }
    return rank;
}

/**
 * Converte texto copiado do Jira (ou listas Markdown) em itens do checklist.
 * Linhas vazias são ignoradas e os marcadores visuais são removidos.
 */
export function parseChecklistText(value) {
    const parsedLines = String(value ?? '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map(readLine)
        .filter((line) => line.content.length > 0);

    const indentationColumns = [
        ...new Set(
            parsedLines
                .map((line) => line.leadingSpaces)
                .filter((spaces) => spaces > 0),
        ),
    ].sort((a, b) => a - b);

    let insideNumberedGroup = false;

    return parsedLines.map((line) => {
        let indentLevel = Math.max(
            getIndentRank(line.leadingSpaces, indentationColumns),
            line.markerDepth,
        );

        if (
            line.markerType === 'letter'
            && line.leadingSpaces === 0
            && insideNumberedGroup
        ) {
            indentLevel = Math.max(indentLevel, 1);
        }

        if (line.markerType === 'number' && line.markerDepth === 0) {
            insideNumberedGroup = true;
        } else if (
            line.markerType !== 'letter'
            && line.leadingSpaces === 0
            && line.markerType !== null
        ) {
            insideNumberedGroup = false;
        }

        return {
            text: line.content,
            checked: line.checked,
            indentLevel: Math.min(indentLevel, MAX_INDENT_LEVEL),
        };
    });
}
