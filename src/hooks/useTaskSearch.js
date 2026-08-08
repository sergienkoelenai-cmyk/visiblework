import { useMemo } from 'react';
import { getTaskAllowInFeats } from '../data/feats';

/**
 * Custom hook for real-time multi-pool task searching.
 * Filters across active tasks, scheduled routines, category templates, and Feat pool items.
 *
 * @param {string} query
 * @param {Object[]} tasks
 * @param {Object[]} categories
 * @returns {Object[]}
 */
export function useTaskSearch(query = '', tasks = [], categories = []) {
  return useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat.id] = cat;
    });

    // Filter tasks by title, category label, or description
    return tasks.filter((task) => {
      if (!task) return false;

      const titleMatch = (task.title || '').toLowerCase().includes(cleanQuery);
      const catObj = categoryMap[task.category || 'other'];
      const catLabelMatch = catObj ? (catObj.label || '').toLowerCase().includes(cleanQuery) : false;
      const descMatch = (task.description || task.notes || '').toLowerCase().includes(cleanQuery);

      if (!titleMatch && !catLabelMatch && !descMatch) {
        return false;
      }

      return true;
    }).map((task) => {
      const catObj = categoryMap[task.category || 'other'] || { label: 'Other', emoji: '📋' };
      const isFeat = getTaskAllowInFeats(task);

      return {
        ...task,
        categoryName: catObj.label,
        categoryEmoji: catObj.emoji || '📋',
        isFavorite: !!task.isFavorite,
        isFeatPool: isFeat,
      };
    });
  }, [query, tasks, categories]);
}
