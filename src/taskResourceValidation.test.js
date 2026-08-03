import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTaskResource } from './taskResourceValidation.js';

test('aceita links HTTP e normaliza o título opcional', () => {
    const result = validateTaskResource({
        type: 'link',
        value: '  https://docs.example.com/guia  ',
        label: '  Guia técnico  ',
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.value, {
        type: 'link',
        value: 'https://docs.example.com/guia',
        label: 'Guia técnico',
    });
});

test('recusa protocolos inseguros e URLs incompletas', () => {
    for (const value of ['javascript:alert(1)', 'docs.example.com', 'ftp://example.com']) {
        const result = validateTaskResource({ type: 'link', value });
        assert.equal(result.valid, false);
        assert.match(result.errors.value, /http:\/\//);
    }
});

test('impede a duplicação exata de um link na mesma tarefa', () => {
    const resources = [
        { id: 7, type: 'link', value: 'https://example.com/referencia' },
    ];

    const duplicate = validateTaskResource(
        { type: 'link', value: 'https://example.com/referencia' },
        resources,
    );
    assert.equal(duplicate.valid, false);
    assert.match(duplicate.errors.value, /já está/);

    const editingItself = validateTaskResource(
        { type: 'link', value: 'https://example.com/referencia' },
        resources,
        7,
    );
    assert.equal(editingItself.valid, true);
});

test('exige conteúdo em recursos de texto', () => {
    const result = validateTaskResource({ type: 'text', value: '   ' });
    assert.equal(result.valid, false);
    assert.match(result.errors.value, /Escreva/);
});
