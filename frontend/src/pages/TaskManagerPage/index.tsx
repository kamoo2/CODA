import React, { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import { TaskDto } from '@/types/task';
import taskService from '@/apis/services/taskService';

export default function TaskManagerPage() {
  // 활성화된 탭 상태
  const [activeTab, setActiveTab] = useState<'All' | 'Running' | 'Waiting' | 'Complete'>('All');
  // 작업 상태
  const [tasks, setTasks] = useState<TaskDto[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    if (activeTab === 'All') return tasks;
    return tasks.filter((task) => task.status === activeTab);
  }, [tasks, activeTab]);

  const fetchTasks = async () => {
    try {
      const response = await taskService.getTasks();
      if (response.success) {
        setTasks(response.result);
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    }
  };
  // table columns 설정
  const taskTableColumns = React.useMemo<ColumnDef<TaskDto>[]>(
    () => [
      {
        header: 'No',
        id: 'no',
        accessorFn: (row, index) => index + 1, // No 열을 1부터 1씩 증가하는 값으로 설정
        enableColumnFilter: false,
        enableSorting: true,
      },

      {
        header: 'User',
        id: 'user',
        accessorFn: (row) => `${row.userTeam}/${row.userName}`,
        cell: (info) => {
          const row = info.row.original;
          return <p>{`${row.userTeam}/${row.userName}`}</p>;
        },
        enableColumnFilter: true,
        enableSorting: true,
        meta: {
          filterVariant: 'text', // 필터 UI에서 텍스트 입력창 사용
        },
      },

      {
        header: 'Task',
        id: 'name',
        accessorFn: (row) => row.name,
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.name}</p>;
        },
        enableColumnFilter: true,
        enableSorting: true,
      },

      {
        header: 'Status',
        id: 'status',
        accessorFn: (row) => row.status,
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.status}</p>;
        },
        enableColumnFilter: true,
        enableSorting: true,
      },

      {
        header: 'Start Date',
        id: 'startDate',
        accessorFn: (row) => row.startDate.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.startDate.replace('T', ' ')}</p>;
        },
        enableColumnFilter: true,
        enableSorting: true,
      },

      {
        header: 'End Date',
        id: 'endDate',
        accessorFn: (row) => row.endDate?.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.endDate?.replace('T', ' ')}</p>;
        },
        enableColumnFilter: true,
        enableSorting: true,
      },

      {
        header: '',
        id: 'menu',
        cell: (info) => {
          const row = info.row.original;
          return <button>...</button>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    [tasks],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'All' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('All')}
        >
          All
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'Running' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('Running')}
        >
          Running
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'Waiting' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('Waiting')}
        >
          Waiting
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'Complete' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('Complete')}
        >
          Complete
        </button>
      </div>

      <TableComponent columns={taskTableColumns} data={filteredTasks} />
    </div>
  );
}
