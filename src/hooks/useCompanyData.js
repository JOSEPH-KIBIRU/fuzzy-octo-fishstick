import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useCompany } from '../contexts/CompanyContext';

// Hook for fetching company-specific data
export const useCompanyData = (table, options = {}) => {
  const { currentCompany } = useCompany();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    select = '*',
    filters = {},
    orderBy = 'created_at',
    orderAscending = false,
    limit = null,
    realtime = false
  } = options;

  useEffect(() => {
    if (!currentCompany?.id) {
      console.warn('No company selected, cannot fetch data');
      setData([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from(table)
          .select(select)
          .eq('company_id', currentCompany.id); // CRITICAL: Filter by company_id

        // Apply additional filters
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            query = query.eq(key, filters[key]);
          }
        });

        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy, { ascending: orderAscending });
        }

        // Apply limit
        if (limit) {
          query = query.limit(limit);
        }

        const { data: result, error: queryError } = await query;

        if (queryError) throw queryError;

        setData(result || []);

      } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription if needed
    let subscription;
    if (realtime && currentCompany?.id) {
      subscription = supabase
        .channel(`${table}-${currentCompany.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table,
            filter: `company_id=eq.${currentCompany.id}` // CRITICAL: Filter by company
          }, 
          () => fetchData()
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [table, currentCompany.id, select, orderBy, orderAscending, limit, realtime, filters]);

  return { data, loading, error, refetch: () => {} };
};

// Hook for company-specific insert
export const useCompanyInsert = (table) => {
  const { currentCompany } = useCompany();

  const insert = async (data, options = {}) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    // Auto-add company_id to all inserts
    const dataWithCompany = {
      ...data,
      company_id: currentCompany.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from(table)
      .insert(dataWithCompany)
      .select()
      .single();

    if (error) throw error;
    return result;
  };

  return { insert };
};

// Hook for company-specific update
export const useCompanyUpdate = (table) => {
  const { currentCompany } = useCompany();

  const update = async (id, data, options = {}) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    // Ensure we're only updating records from this company
    const { data: result, error } = await supabase
      .from(table)
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', currentCompany.id) // CRITICAL: Ensure company isolation
      .select()
      .single();

    if (error) throw error;
    return result;
  };

  return { update };
};

// Hook for company-specific delete
export const useCompanyDelete = (table) => {
  const { currentCompany } = useCompany();

  const remove = async (id) => {
    if (!currentCompany?.id) {
      throw new Error('No company selected');
    }

    // Ensure we're only deleting records from this company
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('company_id', currentCompany.id); // CRITICAL: Ensure company isolation

    if (error) throw error;
  };

  return { remove };
};