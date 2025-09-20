/**
 * ML Services - Modular Machine Learning Components
 *
 * This directory contains modularized ML algorithms and services
 * that were previously contained in the monolithic ml-clustering-services.ts file.
 *
 * Components:
 * - similarity/: Similarity calculation algorithms and service
 * - clustering/: Clustering algorithms and service
 * - types.ts: Shared type definitions
 */

// Export all similarity-related components
export * from './similarity/similarity-service';
export * from './similarity/euclidean-similarity';
export * from './similarity/cosine-similarity';
export * from './similarity/weighted-similarity';

// Export all clustering-related components
export * from './clustering/clustering-service';
export * from './clustering/k-means-algorithm';
export { FeatureExtractionService } from './clustering/feature-extraction';
export { ClusterAnalysisService } from './clustering/cluster-analysis';

// Export shared types
export * from './types';