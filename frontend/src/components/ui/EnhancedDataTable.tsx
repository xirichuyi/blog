import React, { useState, useMemo } from 'react';
import { showConfirmDialog } from './ConfirmDialog';
import './EnhancedDataTable.css';

interface TableColumn<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface TableAction<T = any> {
  key: string;
  label: string;
  icon: string;
  onClick: (record: T) => void;
  disabled?: (record: T) => boolean;
  color?: 'primary' | 'secondary' | 'error';
}

interface BulkAction<T = any> {
  key: string;
  label: string;
  icon: string;
  onClick: (selectedRecords: T[]) => void;
  color?: 'primary' | 'secondary' | 'error';
  confirmMessage?: string;
}

interface EnhancedDataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  loading?: boolean;
  error?: string;
  selectable?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onPageChange: (page: number, pageSize: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc' | null) => void;
  emptyState?: {
    icon?: string;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
  rowKey?: string | ((record: T) => string);
}

type SortState = {
  key: string | null;
  direction: 'asc' | 'desc' | null;
};

const EnhancedDataTable = <T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  bulkActions = [],
  loading = false,
  error,
  selectable = false,
  pagination,
  onSort,
  emptyState,
  className = '',
  rowKey = 'id'
}: EnhancedDataTableProps<T>) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: null });

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = data.map((record, index) => getRowKey(record, index));
      setSelectedRows(new Set(allKeys));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedRows(newSelected);
  };

  const handleSort = (columnKey: string) => {
    if (!onSort) return;

    let newDirection: 'asc' | 'desc' | null = 'asc';

    if (sortState.key === columnKey) {
      if (sortState.direction === 'asc') {
        newDirection = 'desc';
      } else if (sortState.direction === 'desc') {
        newDirection = null;
      }
    }

    setSortState({ key: columnKey, direction: newDirection });
    onSort(columnKey, newDirection);
  };

  const handleBulkAction = async (action: BulkAction<T>) => {
    const selectedRecords = data.filter((record, index) =>
      selectedRows.has(getRowKey(record, index))
    );

    if (action.confirmMessage) {
      // Use Material Design confirmation dialog instead of native alert
      const confirmed = await showConfirmDialog({
        title: 'Confirm Action',
        message: action.confirmMessage.replace('{count}', selectedRecords.length.toString()),
        confirmText: action.label,
        cancelText: 'Cancel',
        type: 'warning'
      });

      if (!confirmed) return;
    }

    action.onClick(selectedRecords);
    setSelectedRows(new Set()); // Clear selection after action
  };

  const selectedRecords = useMemo(() => {
    return data.filter((record, index) =>
      selectedRows.has(getRowKey(record, index))
    );
  }, [data, selectedRows, rowKey]);

  const isAllSelected = selectedRows.size === data.length && data.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

  if (loading) {
    return (
      <div className="enhanced-table-loading">
        <md-circular-progress indeterminate></md-circular-progress>
        <p className="md-typescale-body-medium">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-table-error">
        <md-icon class="error-icon">error</md-icon>
        <h3 className="md-typescale-headline-small">Error Loading Data</h3>
        <p className="md-typescale-body-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className={`enhanced-data-table ${className}`}>
      {/* Bulk Actions Bar */}
      {selectable && selectedRows.size > 0 && bulkActions.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-actions-info">
            <md-icon>check_circle</md-icon>
            <span className="md-typescale-body-medium">
              {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="bulk-actions-buttons">
            {bulkActions.map((action) => (
              <md-text-button
                key={action.key}
                onClick={() => handleBulkAction(action)}
                class={`bulk-action-${action.color || 'primary'}`}
              >
                <md-icon slot="icon">{action.icon}</md-icon>
                {action.label}
              </md-text-button>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <table className="enhanced-table">
          <thead>
            <tr>
              {selectable && (
                <th className="select-column">
                  <md-checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={(e: any) => handleSelectAll(e.target.checked)}
                  ></md-checkbox>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`table-header ${column.align || 'left'} ${column.sortable ? 'sortable' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="header-content">
                    <span className="md-typescale-title-small">{column.title}</span>
                    {column.sortable && (
                      <md-icon class={`sort-icon ${sortState.key === column.key
                        ? sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc'
                        : 'sort-none'
                        }`}>
                        {sortState.key === column.key
                          ? sortState.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'
                          : 'unfold_more'
                        }
                      </md-icon>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="actions-column">
                  <span className="md-typescale-title-small">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((record, index) => {
              const key = getRowKey(record, index);
              const isSelected = selectedRows.has(key);

              return (
                <tr key={key} className={`table-row ${isSelected ? 'selected' : ''}`}>
                  {selectable && (
                    <td className="select-column">
                      <md-checkbox
                        checked={isSelected}
                        onChange={(e: any) => handleSelectRow(key, e.target.checked)}
                      ></md-checkbox>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={`table-cell ${column.align || 'left'}`}>
                      {column.render
                        ? column.render(record[column.key], record, index)
                        : record[column.key]
                      }
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="actions-column">
                      <div className="row-actions">
                        {actions.map((action) => (
                          <md-icon-button
                            key={action.key}
                            onClick={() => action.onClick(record)}
                            disabled={action.disabled?.(record)}
                            class={`action-${action.color || 'primary'}`}
                            title={action.label}
                          >
                            <md-icon>{action.icon}</md-icon>
                          </md-icon-button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && emptyState && (
        <div className="empty-state">
          {emptyState.icon && <md-icon class="empty-icon">{emptyState.icon}</md-icon>}
          <h3 className="md-typescale-headline-small">{emptyState.title}</h3>
          {emptyState.description && (
            <p className="md-typescale-body-medium">{emptyState.description}</p>
          )}
          {emptyState.action && (
            <md-filled-button onClick={emptyState.action.onClick}>
              {emptyState.action.label}
            </md-filled-button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="table-pagination">
          <div className="pagination-info">
            <span className="md-typescale-body-small">
              Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} entries
            </span>
          </div>
          <div className="pagination-controls">
            {pagination.showSizeChanger && (
              <select
                value={pagination.pageSize.toString()}
                onChange={(e) => pagination.onPageChange(1, parseInt(e.target.value))}
                className="page-size-selector"
              >
                {(pagination.pageSizeOptions || [10, 20, 50, 100]).map(size => (
                  <option key={size} value={size.toString()}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}
            <div className="page-controls">
              <button
                className="page-nav-button"
                disabled={pagination.current <= 1}
                onClick={() => pagination.onPageChange(pagination.current - 1, pagination.pageSize)}
                aria-label="Previous page"
              >
                <md-icon>chevron_left</md-icon>
              </button>
              <span className="md-typescale-body-medium">
                Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <button
                className="page-nav-button"
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                onClick={() => pagination.onPageChange(pagination.current + 1, pagination.pageSize)}
                aria-label="Next page"
              >
                <md-icon>chevron_right</md-icon>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default EnhancedDataTable;
export { type TableColumn, type TableAction, type BulkAction };
