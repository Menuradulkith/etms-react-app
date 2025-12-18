import React, { createContext, useContext, useState, useCallback } from 'react';
import { departmentsAPI } from '../services/api';

const DepartmentContext = createContext();

export const useDepartments = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartments must be used within DepartmentProvider');
  }
  return context;
};

export const DepartmentProvider = ({ children }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await departmentsAPI.getAll();
      const deptNames = response.data.departments.map(d => d.name).sort();
      setDepartments(deptNames);
      setLastUpdated(Date.now());
      return deptNames;
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createDepartment = useCallback(async (deptData) => {
    try {
      await departmentsAPI.create(deptData);
      await fetchDepartments(); // Refresh list
      return true;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }, [fetchDepartments]);

  const deleteDepartment = useCallback(async (deptId) => {
    try {
      await departmentsAPI.delete(deptId);
      await fetchDepartments(); // Refresh list
      return true;
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }, [fetchDepartments]);

  const refreshDepartments = useCallback(() => {
    return fetchDepartments();
  }, [fetchDepartments]);

  const value = {
    departments,
    loading,
    lastUpdated,
    fetchDepartments,
    createDepartment,
    deleteDepartment,
    refreshDepartments
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
};