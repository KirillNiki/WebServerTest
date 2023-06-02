namespace ServerConnection;

class CurrentPlayerIndex
{
    public int currentPlayerIndex { get; set; }
}

class MatrixData
{
    public int playerId { get; set; }
    public int[][]? fieldMatrix { get; set; }
}

class CellData
{
    public int playerId { get; set; }
    public int y { get; set; }
    public int x { get; set; }
}

class SuccessFulOperation
{
    public int success { get; set; }
}

class MoveNumber
{
    public int moveNumber { get; set; }
}
