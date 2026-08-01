import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChecklistText } from './checklistParser.js';

test('converte o exemplo do Jira e mantém a hierarquia', () => {
    const source = `1. [documentação] Criar diagramas de fluxo de criação e gerenciamento de Order no payment-services
   a. Diagrama do fluxo de criação
   b. Diagrama do fluxo de leitura
   c. Diagrama do fluxo de atualização de status Transaction-> Order`;

    assert.deepEqual(parseChecklistText(source), [
        {
            text: '[documentação] Criar diagramas de fluxo de criação e gerenciamento de Order no payment-services',
            checked: false,
            indentLevel: 0,
        },
        {
            text: 'Diagrama do fluxo de criação',
            checked: false,
            indentLevel: 1,
        },
        {
            text: 'Diagrama do fluxo de leitura',
            checked: false,
            indentLevel: 1,
        },
        {
            text: 'Diagrama do fluxo de atualização de status Transaction-> Order',
            checked: false,
            indentLevel: 1,
        },
    ]);
});

test('entende bullets e checkboxes Markdown', () => {
    const source = `- [x] Levantar contexto
  - [ ] Implementar
  - Validar`;

    assert.deepEqual(parseChecklistText(source), [
        { text: 'Levantar contexto', checked: true, indentLevel: 0 },
        { text: 'Implementar', checked: false, indentLevel: 1 },
        { text: 'Validar', checked: false, indentLevel: 1 },
    ]);
});

test('usa letras como subtarefas quando o clipboard perde a indentação', () => {
    const source = `1. Fluxo principal
a. Criar
b. Validar
2. Outro fluxo`;

    assert.deepEqual(
        parseChecklistText(source).map(({ text, indentLevel }) => ({
            text,
            indentLevel,
        })),
        [
            { text: 'Fluxo principal', indentLevel: 0 },
            { text: 'Criar', indentLevel: 1 },
            { text: 'Validar', indentLevel: 1 },
            { text: 'Outro fluxo', indentLevel: 0 },
        ],
    );
});

test('mantém linhas simples e ignora linhas vazias', () => {
    assert.deepEqual(parseChecklistText('Primeiro\n\nSegundo'), [
        { text: 'Primeiro', checked: false, indentLevel: 0 },
        { text: 'Segundo', checked: false, indentLevel: 0 },
    ]);
});
