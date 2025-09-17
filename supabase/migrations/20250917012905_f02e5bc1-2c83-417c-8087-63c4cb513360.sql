-- Fix order_index values for existing categories
UPDATE categories SET order_index = 1 WHERE name = 'crypto';
UPDATE categories SET order_index = 2 WHERE name = 'Ai';
UPDATE categories SET order_index = 3 WHERE name = 'meta';
UPDATE categories SET order_index = 4 WHERE name = 'tools';