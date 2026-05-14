using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Shared.Interfaces;

public interface IBaseRepository<T> where T : Entity
{
    Task<T?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<PagedResult<T>> GetPagedAsync(int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
