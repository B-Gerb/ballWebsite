import assert from 'node:assert/strict';
import test from 'node:test';
import {
    MINIMUM_RUN_POINTS,
    basePrestigePoints,
    collisionMultiplier,
    prestigeAward,
} from '../src/prestigeEquations.js';
import { buildTree, PRESTIGE_NODES } from '../src/data/prestigeTree.js';

test('prestige equations are deterministic and safe at boundaries', () => {
    assert.equal(basePrestigePoints(0), 0);
    assert.equal(prestigeAward(0, 0, 1), 0);
    assert.equal(prestigeAward(MINIMUM_RUN_POINTS - 1, 100, 1), 0);
    assert.equal(
        prestigeAward(MINIMUM_RUN_POINTS, 9, 1),
        Math.floor(basePrestigePoints(MINIMUM_RUN_POINTS) * collisionMultiplier(9)),
    );
    assert.ok(prestigeAward(MINIMUM_RUN_POINTS, 100, 1) > prestigeAward(MINIMUM_RUN_POINTS, 0, 1));
    assert.equal(prestigeAward(Infinity, Infinity, Infinity), 0);
    assert.equal(prestigeAward(-1, -1, -1), 0);
    assert.equal(
        prestigeAward(MINIMUM_RUN_POINTS, 0, 2),
        prestigeAward(MINIMUM_RUN_POINTS, 0, 1) * 2,
    );
});

test('prestige tree exposes the requested dependency branches', () => {
    const tree = buildTree();
    const triangle = tree.byId.get('unlock-triangle');
    const square = tree.byId.get('unlock-square');
    const wallValue = tree.byId.get('circle-wall-value');
    const massValue = tree.byId.get('mass-collision-value');

    assert.ok(triangle);
    assert.ok(square);
    assert.ok(wallValue);
    assert.ok(massValue);
    assert.ok(tree.edges.some((edge) => (
        edge.from.id === 'unlock-triangle' && edge.to.id === 'unlock-square'
    )));
    assert.ok(tree.edges.some((edge) => (
        edge.from.id === 'speed-collision-value' && edge.to.id === 'mass-collision-value'
    )));
    assert.ok(tree.edges.some((edge) => (
        edge.from.id === 'size-collision-value' && edge.to.id === 'mass-collision-value'
    )));
});

test('prestige tree node ids and dependencies are internally consistent', () => {
    const ids = new Set(PRESTIGE_NODES.map((node) => node.id));
    assert.equal(ids.size, PRESTIGE_NODES.length);

    PRESTIGE_NODES.forEach((node) => {
        node.requires.forEach((requirement) => {
            const dependencyId = typeof requirement === 'string'
                ? requirement
                : requirement.id;
            assert.ok(ids.has(dependencyId), `${node.id} has an unknown dependency`);
        });
    });
});
