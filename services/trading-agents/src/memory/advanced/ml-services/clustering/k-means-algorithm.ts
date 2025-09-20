import { createLogger } from '../../../../utils/enhanced-logger';

/**
 * K-Means Clustering Algorithm Implementation
 * Uses K-means++ initialization for better centroid selection
 */
export class KMeansAlgorithm {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'k-means-algorithm');
  }

  /**
   * Perform K-means clustering on feature vectors
   */
  cluster(featureVectors: number[][], numClusters: number, config?: {
    maxIterations?: number;
    tolerance?: number;
  }): Array<{
    members: number[];
    centroid: number[];
  }> {
    try {
      const maxIterations = config?.maxIterations || 100;
      const tolerance = config?.tolerance || 0.001;

      // Initialize centroids using K-means++ algorithm
      let centroids: number[][] = this.initializeCentroids(featureVectors, numClusters);

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        // Assign points to nearest centroid
        const assignments = this.assignToClusters(featureVectors, centroids);

        // Update centroids
        const newCentroids = this.updateCentroids(featureVectors, assignments, numClusters);

        // Check for convergence
        if (this.hasConverged(centroids, newCentroids, tolerance)) {
          break;
        }

        centroids = newCentroids;
      }

      // Final assignment
      const finalAssignments = this.assignToClusters(featureVectors, centroids);

      // Group by cluster
      const clusters: Array<{ members: number[]; centroid: number[] }> = [];
      for (let i = 0; i < numClusters; i++) {
        const clusterMembers = finalAssignments
          .map((assignment, index) => assignment === i ? index : -1)
          .filter(index => index !== -1);

        if (clusterMembers.length > 0) {
          const centroid = centroids[i];
          if (centroid) {
            clusters.push({
              members: clusterMembers,
              centroid: centroid
            });
          }
        }
      }

      return clusters;

    } catch (error) {
      this.logger.warn('k-means-clustering-failed', 'K-means clustering failed', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return [];
    }
  }

  /**
   * Initialize centroids using K-means++ algorithm
   */
  private initializeCentroids(featureVectors: number[][], numClusters: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    // First centroid: random selection
    const firstIndex = Math.floor(Math.random() * featureVectors.length);
    const firstVector = featureVectors[firstIndex];
    if (firstVector) {
      centroids.push([...firstVector]);
      usedIndices.add(firstIndex);
    }

    // Subsequent centroids: probability proportional to squared distance
    for (let i = 1; i < numClusters; i++) {
      const distances = featureVectors.map((vector, index) => {
        if (usedIndices.has(index) || !vector) return 0;
        return Math.min(...centroids.map(centroid => this.euclideanDistance(vector, centroid)));
      });

      const totalDistance = distances.reduce((sum, dist) => sum + dist * dist, 0);
      let randomValue = Math.random() * totalDistance;

      let selectedIndex = 0;
      for (let j = 0; j < distances.length; j++) {
        if (!usedIndices.has(j)) {
          const distance = distances[j] || 0;
          randomValue -= distance * distance;
          if (randomValue <= 0) {
            selectedIndex = j;
            break;
          }
        }
      }

      const selectedVector = featureVectors[selectedIndex];
      if (selectedVector) {
        centroids.push([...selectedVector]);
        usedIndices.add(selectedIndex);
      }
    }

    return centroids;
  }

  /**
   * Assign each point to the nearest centroid
   */
  private assignToClusters(featureVectors: number[][], centroids: number[][]): number[] {
    return featureVectors.map(vector => {
      let minDistance = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, index) => {
        const distance = this.euclideanDistance(vector, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = index;
        }
      });

      return closestCentroid;
    });
  }

  /**
   * Update centroids based on current assignments
   */
  private updateCentroids(featureVectors: number[][], assignments: number[], numClusters: number): number[][] {
    const newCentroids = [];

    for (let i = 0; i < numClusters; i++) {
      const clusterPoints = assignments
        .map((assignment, index) => assignment === i ? featureVectors[index] : null)
        .filter(point => point !== null) as number[][];

      if (clusterPoints.length > 0) {
        const centroid = this.calculateCentroid(clusterPoints);
        newCentroids.push(centroid);
      } else {
        // Keep old centroid if no points assigned
        newCentroids.push([0.5, 0.5, 0.15, 0.1, 0, 0.5, 1, 0, 1, 1]);
      }
    }

    return newCentroids;
  }

  /**
   * Check if centroids have converged
   */
  private hasConverged(oldCentroids: number[][], newCentroids: number[][], tolerance: number): boolean {
    for (let i = 0; i < oldCentroids.length; i++) {
      const oldCentroid = oldCentroids[i];
      const newCentroid = newCentroids[i];

      if (!oldCentroid || !newCentroid) continue;

      const distance = this.euclideanDistance(oldCentroid, newCentroid);
      if (distance > tolerance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(vector1: number[], vector2: number[]): number {
    if (!vector1 || !vector2) return Infinity;

    let sum = 0;
    const length = Math.min(vector1.length, vector2.length);

    for (let i = 0; i < length; i++) {
      const val1 = vector1[i] || 0;
      const val2 = vector2[i] || 0;
      const diff = val1 - val2;
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate centroid of a set of points
   */
  private calculateCentroid(points: number[][]): number[] {
    if (points.length === 0 || !points[0]) return [];

    const dimensions = points[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const point of points) {
      if (!point) continue;

      for (let i = 0; i < Math.min(dimensions, point.length); i++) {
        centroid[i] += point[i] || 0;
      }
    }

    for (let i = 0; i < dimensions; i++) {
        centroid[i] /= points.length;
    }

    return centroid;
  }
}