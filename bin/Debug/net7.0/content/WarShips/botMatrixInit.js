
function EnemyMatrixInit() {
    for (let i = 0; i < EnemyFieldMatrix.length; i++) {
        EnemyFieldMatrix[i] = new Array(10);

        for (let j = 0; j < EnemyFieldMatrix[i].length; j++) {
            EnemyFieldMatrix[i][j] = States.none;
        }
    }

    for (let i = 0; i < AllEnemyCells.length; i++) {
        AllEnemyCells[i].y = i % tableLength;
        AllEnemyCells[i].x = (i - AllEnemyCells[i].y) / tableLength;
    }

    let index = 0;
    for (let i = 0; i < tableLength; i++) {
        for (let j = 0; j < tableLength; j++) {
            CellsToChose[index] = ({ y: i, x: j });
            index++;
        }
    }
}




function EnemyesFieldInit() {
    let shipsClassCount = 1;
    let shipLen = 4;
    let bysideCount = 0;

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < shipsClassCount; j++) {

            var isPuted = false;
            while (isPuted === false) {
                var byside = Math.floor(Math.random() * 2);
                var randomY = Math.floor(Math.random() * 10);
                var randomX = Math.floor(Math.random() * 10);

                if (byside === BySide.byside || bysideCount < i) {
                    var upRight = Math.floor(Math.random() * 2);

                    if (upRight === TopRight.top) {
                        randomY = Math.floor(Math.random() * 2);
                        if (randomY === 0) {
                            randomY = 0;
                        }
                        else {
                            randomY = 9;
                        }
                    }
                    else {
                        randomX = Math.floor(Math.random() * 2);
                        if (randomX === 0) {
                            randomX = 0;
                        }
                        else {
                            randomX = 9;
                        }
                    }
                }
                if (EnemyFieldMatrix[randomY][randomX] === States.none) {
                    var allRotations = [];

                    while (isPuted === false && allRotations.length < 4) {
                        let side = Math.floor(Math.random() * 4);
                        let isAlreadyRotated = false;

                        for (let g = 0; g < allRotations.length; g++) {
                            if (side === allRotations[g])
                                isAlreadyRotated = true;
                        }
                        if (!isAlreadyRotated) {
                            switch (side) {
                                case Sides.up:
                                    if (randomY - shipLen >= 0 && EnemyFieldMatrix[randomY - shipLen][randomX] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY - shipLen, randomX, randomY, randomX + 1);
                                        isPuted = true;
                                    }
                                    break;

                                case Sides.right:
                                    if (randomX + shipLen < tableLength && EnemyFieldMatrix[randomY][randomX + shipLen] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY, randomX, randomY + 1, randomX + shipLen);
                                        isPuted = true;
                                    }
                                    break;

                                case Sides.down:
                                    if (randomY + shipLen < tableLength && EnemyFieldMatrix[randomY + shipLen][randomX] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY, randomX, randomY + shipLen, randomX + 1);
                                        isPuted = true;
                                    }
                                    break;

                                case Sides.left:
                                    if (randomX - shipLen >= 0 && EnemyFieldMatrix[randomY][randomX - shipLen] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY, randomX - shipLen, randomY + 1, randomX);
                                        isPuted = true;
                                    }
                                    break;
                            }
                            allRotations.push(side);
                        }
                    }
                }
                if (randomY === 9 || randomY === 0 || randomX === 9 || randomX === 0)
                    bysideCount++;
            }
        }
        shipsClassCount++;
        shipLen--;
    }
}



function PutEnemyShipIntoMatrix(startY, startX, endY, endX) {
    for (let y = startY - 1; y <= endY; y++) {
        for (let x = startX - 1; x <= endX; x++) {
            if (y >= 0 && y < tableLength && x >= 0 && x < tableLength) {
                EnemyFieldMatrix[y][x] = States.busy;
            }
        }
    }

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            EnemyFieldMatrix[y][x] = States.ship;
        }
    }
}