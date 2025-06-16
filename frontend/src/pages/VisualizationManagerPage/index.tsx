import { useEffect, useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table';
import { HiEllipsisVertical, HiOutlineTrash, HiPlay } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';
import visualizationService from '@/apis/services/visualizationService';
import { EVisualizationProcessStatus, SimpleVisualizationProject } from '@/types/visualization';
import EditableInput from '@/components/common/Input/EditableInput';
import useModal from '@/hooks/useModal';
import CreateVisualizationModal from '@/components/pages/VisualizationManagerPage/CreateVisualizationModal';
import { useVisualizationProjectStore } from '@/store/visualization/projectStore';

const VisualizationManagerPage = () => {
  const navigate = useNavigate();
  const {
    projects,
    checkedProjectIds,
    setProjects,
    deleteProject,
    deleteProjects,
    toggleProjectCheck,
    setCheckedProjects,
    resetCheckedProjects,
  } = useVisualizationProjectStore();

  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProjects();
    setLoading(false);
  }, []);

  const fetchProjects = async () => {
    const response = await visualizationService.getMyProjects();
    if (response.success) {
      setError(false);
      setProjects(response.result);
    } else {
      setError(true);
    }
  };

  const handleSave = async (newName: string, projectId: string) => {
    try {
      const response = await visualizationService.updateVisualizationProjectByName(projectId, newName);
      if (response.success) {
        setProjects(projects.map((p) => (p.id === projectId ? { ...p, name: newName } : p)));
      } else {
        console.error('업데이트 실패:', response.message);
      }
    } catch (e) {
      console.error('API 오류:', e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const response = await visualizationService.deleteVisualizationProject(id);
    if (response.success) {
      deleteProject(id);
    }
  };

  const handleDeleteProjects = async () => {
    const ids = checkedProjectIds;
    if (ids.length === 0) return;
    const confirmed = window.confirm('정말로 선택한 프로젝트를 삭제하시겠습니까?');
    if (!confirmed) return;

    const response = await visualizationService.deleteVisualizationProjectByIds(ids);
    if (response.success) {
      deleteProjects(ids);
    }
  };

  const handleModalOpen = () => {
    handleClickModalOpen();
  };

  const columns: ColumnDef<SimpleVisualizationProject>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={checkedProjectIds.length > 0 && checkedProjectIds.length === projects.length}
          onChange={(e) => (e.target.checked ? setCheckedProjects(projects.map((p) => p.id)) : resetCheckedProjects())}
        />
      ),
      cell: (info) => (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={checkedProjectIds.includes(info.row.original.id)}
          onChange={() => toggleProjectCheck(info.row.original.id)}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: (info) => {
        const project = info.row.original;
        return (
          <EditableInput
            initialValue={String(info.getValue())}
            fontSize="12px"
            onSave={(newValue) => handleSave(newValue, project.id)} // ✅ id 바로 전달
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as EVisualizationProcessStatus;
        const className =
          status === EVisualizationProcessStatus.PROCESSING
            ? styles.statusRunning
            : status === EVisualizationProcessStatus.COMPLETE
              ? styles.statusComplete
              : styles.statusStop;
        return <span className={`${styles.statusBadge} ${className}`}>{status}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const status = info.row.original.status;
        const isDisabled = status === EVisualizationProcessStatus.NOT_STARTED;

        const className = isDisabled ? styles.disabled : styles.playBtn;
        return (
          <div className={styles.actionButtons}>
            <button disabled={isDisabled}>
              <HiPlay className={className} onClick={() => navigate(`/visualization-viewer/${info.row.original.id}`)} />
            </button>
            <button>
              <HiEllipsisVertical className={styles.moreBtn} />
            </button>
            <button>
              <HiOutlineTrash className={styles.deleteBtn} onClick={() => handleDeleteProject(info.row.original.id)} />
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: projects,
    state: {
      globalFilter: searchText,
    },
    onGlobalFilterChange: setSearchText,
    globalFilterFn: 'includesString',
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Failed to load projects.</p>;

  return (
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <h2 className={styles.title}>Visualization Projects</h2>
        <div className={styles.headerControls}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search project name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {checkedProjectIds.length > 0 && (
            <button onClick={handleDeleteProjects} className={styles.deleteButton}>
              🗑 선택 삭제
            </button>
          )}
          <button onClick={handleModalOpen} className={styles.createButton}>
            + New Project
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <div className={styles.tableGridHeader}>
          {table.getHeaderGroups().map((headerGroup) => (
            <div className={styles.gridRow} key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div className={styles.cell} key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>
        {table.getRowModel().rows.map((row) => (
          <div className={styles.tableGridRow} key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <div className={styles.cell} key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>

      {isOpen && <CreateVisualizationModal handleClickModalClose={handleClickModalClose} />}
    </div>
  );
};

export default VisualizationManagerPage;
