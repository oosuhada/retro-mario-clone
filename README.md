# Retro Mario Clone

A browser-playable JavaScript recreation of the classic **Super Mario Bros.** experience using a hand-built HTML5 Canvas game engine.

## Play

https://retro.oosu.dev/mario/

## Gameplay

- Side-scrolling platform movement
- Classic jump and run controls
- Goomba and Koopa enemies
- Coins and breakable blocks
- Mushroom, Fire Flower and Star items
- Fireball projectiles
- Pipes and underground areas
- Flagpole and stage-clear flow
- Classic sound effects and background music

## Controls

- Move: Arrow keys
- Jump: `X`
- Run / action: `Z`

## Engine

The game runs on an HTML5 Canvas loop that updates player input, entities, collisions, scrolling and rendering at interactive frame rates.

Game objects such as enemies, items, projectiles, terrain and the player use separate entity and sprite layers. The viewport follows the player as the stage scrolls horizontally, while nearby entities are activated as they approach the visible play area.

## Structure

```text
js/game.js         game loop and world state
js/player.js       player movement and actions
js/entity.js       shared entity behavior
js/levels/         stage definitions
js/goomba.js       Goomba behavior
js/koopa.js        Koopa behavior
js/mushroom.js     Mushroom item
js/fireflower.js   Fire Flower item
js/star.js         Star item
js/fireball.js     fireball projectile
sprites/           game sprites
sounds/            music and sound effects
```

## Deployment

Production is served from `https://retro.oosu.dev/mario/`.
