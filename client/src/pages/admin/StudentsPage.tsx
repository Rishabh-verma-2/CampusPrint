import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  Clock,
  Printer,
  X,
  UserCheck,
  UserX,
  Building2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';
import { StatusBadge, Spinner } from '../../components/ui';

interface StudentItem {
  _id: string;
  name: string;
  email: string;
  phone: string;
  enrollmentNumber?: string;
  department?: string;
  year?: string;
  role: string;
  isActive: boolean;
  orderCount?: number;
  lastActivity?: string;
  createdAt: string;
  universityId?: { _id: string; name: string };
  campusId?: { _id: string; name: string };
}

const StudentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminStudents', search],
    queryFn: () =>
      adminApi
        .getStudents({ search: search.trim() || undefined })
        .then((r) => r.data.data),
  });

  const {
    data: studentDetailData,
    isLoading: isLoadingDetails,
  } = useQuery({
    queryKey: ['adminStudentDetail', selectedStudentId],
    queryFn: () =>
      selectedStudentId
        ? adminApi.getStudentById(selectedStudentId).then((r) => r.data.data)
        : null,
    enabled: !!selectedStudentId,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      toast.success('Student account status updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update student status');
    },
  });

  const students: StudentItem[] = data?.students || [];
  const total = data?.total ?? students.length;
  const activeCount = students.filter((s) => s.isActive !== false).length;
  const totalOrders = students.reduce((acc, s) => acc + (s.orderCount || 0), 0);

  const selectedStudent = studentDetailData?.student || students.find((s) => s._id === selectedStudentId);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <GraduationCap size={12} />
            <span>Parul University Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View registered students, university enrollments, and printing history
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Students
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          <span className="text-[11px] text-slate-400">Registered on platform</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Active Accounts
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          <span className="text-[11px] text-slate-400">Eligible to print</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Orders Placed
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalOrders}</p>
          <span className="text-[11px] text-slate-400">Lifetime print jobs</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Campus Affiliation
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">Parul University</p>
          <span className="text-[11px] text-slate-400">Limda, Vadodara</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by student name, enrollment, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-slate-500">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Students Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search
                ? `No students match "${search}". Try searching with a different name or enrollment number.`
                : 'No registered student accounts in the database yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Enrollment Number</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const initials = student.name
                    ? student.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'ST';

                  return (
                    <tr
                      key={student._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{student.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {student.email && !student.email.endsWith('@campusprint.internal')
                                ? student.email
                                : student.enrollmentNumber || student.phone || 'Parul University'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {student.enrollmentNumber ? (
                          <span className="font-mono text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {student.enrollmentNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not provided</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {student.phone || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {student.department || 'General'}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-900">
                        {student.orderCount ?? 0}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {student.lastActivity
                          ? new Date(student.lastActivity).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            student.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {student.isActive !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentId(student._id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Student Profile"
                          >
                            <Eye size={15} />
                          </button>
                          {student.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to deactivate student ${student.name}?`
                                  )
                                ) {
                                  deactivateMutation.mutate(student._id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate Student"
                            >
                              <UserX size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 text-slate-300 rounded-lg"
                              title="Already Deactivated"
                            >
                              <UserCheck size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Drawer */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedStudentId(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Student Details</h3>
                  <p className="text-xs text-slate-500">Parul University student record</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {isLoadingDetails ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : selectedStudent ? (
                  <>
                    {/* Student Basic Card */}
                    <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                        {selectedStudent.name
                          ? selectedStudent.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : 'ST'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {selectedStudent.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {selectedStudent.email && !selectedStudent.email.endsWith('@campusprint.internal')
                            ? selectedStudent.email
                            : selectedStudent.enrollmentNumber || selectedStudent.phone || 'Parul University'}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium mt-1 ${
                            selectedStudent.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {selectedStudent.isActive !== false ? 'Active Account' : 'Deactivated'}
                        </span>
                      </div>
                    </div>

                    {/* Academic & University Profile */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Academic Information
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <GraduationCap size={13} /> Enrollment Number
                          </span>
                          <span className="font-mono font-semibold text-slate-900">
                            {selectedStudent.enrollmentNumber || 'Not specified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Building2 size={13} /> University
                          </span>
                          <span className="font-medium text-slate-900">Parul University</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Building2 size={13} /> Campus
                          </span>
                          <span className="font-medium text-slate-900">
                            Main Campus, Vadodara
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <FileText size={13} /> Department
                          </span>
                          <span className="font-medium text-slate-900">
                            {selectedStudent.department || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Contact Details
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Phone size={13} /> Phone
                          </span>
                          <span className="font-mono text-slate-900">
                            {selectedStudent.phone || '—'}
                          </span>
                        </div>
                        {selectedStudent.email && !selectedStudent.email.endsWith('@campusprint.internal') && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Mail size={13} /> Email
                            </span>
                            <span className="text-slate-900 truncate max-w-[200px]">
                              {selectedStudent.email}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Calendar size={13} /> Registration Date
                          </span>
                          <span className="text-slate-900">
                            {new Date(selectedStudent.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Print History / Orders */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Recent Print Jobs
                        </h4>
                        <span className="text-xs font-bold text-blue-600">
                          {selectedStudent.totalOrders ?? selectedStudent.orderCount ?? 0} total
                        </span>
                      </div>

                      {selectedStudent.jobs && selectedStudent.jobs.length > 0 ? (
                        <div className="space-y-2">
                          {selectedStudent.jobs.map((job: any) => (
                            <div
                              key={job._id}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between"
                            >
                              <div>
                                <div className="font-mono font-bold text-blue-700">
                                  {job.publicToken}
                                </div>
                                <div className="text-slate-500 text-[11px] mt-0.5">
                                  {job.vendorId?.shopName || 'Campus Store'} • {job.printConfig?.totalPages || 1} pages
                                </div>
                              </div>
                              <div className="text-right">
                                <StatusBadge status={job.status} showIcon={false} />
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {new Date(job.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500">No print jobs recorded yet</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Student not found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
