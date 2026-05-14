namespace FundacionPanorama.Domain.Shared;

public class Result
{
    protected Result(bool isSuccess, string? error)
    {
        IsSuccess = isSuccess;
        Error     = error;
    }

    public bool   IsSuccess { get; }
    public bool   IsFailure => !IsSuccess;
    public string? Error    { get; }

    public static Result    Success()              => new(true,  null);
    public static Result    Failure(string error)  => new(false, error);
    public static Result<T> Success<T>(T value)    => Result<T>.Ok(value);
    public static Result<T> Failure<T>(string err) => Result<T>.Fail(err);
}

public class Result<T> : Result
{
    private Result(T value,          string? error) : base(true,  error) => Value = value;
    private Result(string error)                    : base(false, error) => Value = default!;

    public T Value { get; }

    public static Result<T> Ok(T value)       => new(value, null);
    public static Result<T> Fail(string error) => new(error);
}
