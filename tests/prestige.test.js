import assert from 'node:assert/strict';
import test from 'node:test';
import {
    MINIMUM_RUN_POINTS,
    basePrestigePoints,
    collisionMultiplier,
    prestigeAward,
} from '../src/prestigeEquations.js';
import { BRANCHES, PRESTIGE_NODES } from '../src/data/prestigeTree.js';
import { layoutGraph } from '../src/components/whiteboard/graphLayout.js';

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
    const tree = layoutGraph(PRESTIGE_NODES, { warn: () => {} });
    const ids = new Set(tree.nodes.map((node) => node.id));

    ['unlock-triangle', 'unlock-square', 'circle-wall-value', 'mass-collision-value']
        .forEach((id) => assert.ok(ids.has(id), id));
    const edgeIds = new Set(tree.edges.map((edge) => edge.id));
    assert.ok(edgeIds.has('unlock-triangle->unlock-square'));
    assert.ok(edgeIds.has('speed-collision-value->mass-collision-value'));
    assert.ok(edgeIds.has('size-collision-value->mass-collision-value'));
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
        assert.ok(BRANCHES[node.branch], `${node.id} has an unknown branch`);
        assert.equal(node.col, undefined, `${node.id} still has a hand-set col`);
        assert.equal(node.row, undefined, `${node.id} still has a hand-set row`);
    });
});
