import * as THREE from 'three';

export class VoxelChunk {
    static #FACE_GEOMETRY = new THREE.PlaneGeometry();

    // Note that fromArray is column-major.
    // Static matrices definitions which transform the basic PlaneGeometry to the proper position and orientation for
    // each face.
    static #MAT_PX = new THREE.Matrix4().fromArray([
        0, 0, -1, 0,
        0, 1, 0, 0,
        1, 0, 0, 0,
        0.5, 0, 0, 1
    ]);
    static #MAT_NX = new THREE.Matrix4().fromArray([
        0, 0, 1, 0,
        0, 1, 0, 0,
        -1, 0, 0, 0,
        -0.5, 0, 0, 1
    ]);
    static #MAT_PY = new THREE.Matrix4().fromArray([
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        0, 0.5, 0, 1
    ]);
    static #MAT_NY = new THREE.Matrix4().fromArray([
        1, 0, 0, 0,
        0, 0, 1, 0,
        0, -1, 0, 0,
        0, -0.5, 0, 1
    ]);
    static #MAT_PZ = new THREE.Matrix4().fromArray([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0.5, 1
    ]);
    static #MAT_NZ = new THREE.Matrix4().fromArray([
        -1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, -1, 0,
        0, 0, -0.5, 1
    ]);

    static #BITMASK_FACES = 0b1111_1100_0000_0000;
    static #BITMASK_ID = 0b0000_0011_1111_1111_1111;
    static #FACE_PX = 0b1000_0000_0000_0000;
    static #FACE_NX = 0b0100_0000_0000_0000;
    static #FACE_PY = 0b0010_0000_0000_0000;
    static #FACE_NY = 0b0001_0000_0000_0000;
    static #FACE_PZ = 0b0000_1000_0000_0000;
    static #FACE_NZ = 0b0100_0100_0000_0000;

    offsetX = 1;
    offsetY = 1;
    offsetZ = 1;

    constructor(material, spanX, spanY, spanZ, maxFaces = 0) {
        this.spanX = spanX;
        this.spanY = spanY;
        this.spanZ = spanZ;
        this.size = spanX * spanY * spanZ;

        // Due to the use of instanced rendering, the maximum number of voxel faces must be set in advance.
        // If none is provided, sets it to three times the number of voxels, which should be the maximum possible,
        // where the chunk is filled with a 3D checkerboard of empty and nonempty voxels. This should ideally be set
        // lower if possible to minimize memory usage since each maximum voxel face will require allocating about
        // 76 bytes, which adds up quickly.
        if (maxFaces === 0) this.maxFaces = this.size * 3;

        // Voxels are indexed linearly. The offset values are the index offset to move by 1 in each coordinate.
        // noinspection JSSuspiciousNameCombination
        this.offsetY = spanX;
        this.offsetZ = spanX * spanY;

        // Base coordinate offsets for rendered faces, shifting them to the negative corner of the chunk. They can then
        // be translated to the correct position by simply adding their index coordinates to the translation.
        this.posShiftX = (spanX - 1.0) * 0.5;
        this.posShiftY = (spanY - 1.0) * 0.5;
        this.posShiftZ = (spanZ - 1.0) * 0.5;

        // Voxel data is stored as a uint16 array.
        //
        // The bottom 10 bits may be used as desired, intended as an ID for colors/materials.
        // ID 0 is uniquely assumed to always mean that the voxel is empty. This means it will be skipped in rendering
        // and filled voxels with faces against an empty voxel will have those faces set to be rendered. If a voxel's
        // ID is set to 0, its visible faces will also be set as such to make distinguishing empty voxels easier.
        //
        // The top 6 bits are a bitset indicating which voxel faces are exposed and should be rendered.
        // From high to low bits, the directions are: +X, -X, +Y, -Y, +Z, -Z
        this.voxels = new Uint16Array(spanX * spanY * spanZ);

        this.mesh = new THREE.InstancedMesh(VoxelChunk.#FACE_GEOMETRY, material, this.maxFaces);
    }

    // Fully compute visible faces for all voxels. Should be used on initialization or a major change to the entire
    // chunk, but not when only a single or a few voxels are altered.
    computeVisibleFaces() {
        for (let x = 0; x < this.spanX; x++)
        for (let y = 0; y < this.spanY; y++)
        for (let z = 0; z < this.spanZ; z++) {
            this.updateVoxelFaces(x, y, z);
        }
    }

    // Update the faces of a single voxel. Does nothing if target voxel coordinate is not within the chunk. Does NOT
    // update adjacent voxels!
    updateVoxelFaces(x, y, z) {
        const oi = x + y * this.offsetY + z * this.offsetZ;
        if (oi < 0 || oi >= this.size) return;
        let voxel = this.voxels[oi];
        if (voxel === 0) return;

        // Below is essentially a manual loop unrolling. We check each adjacent space. If out of bounds or the voxel
        // there is empty, turn on the face.

        let i = oi + this.offsetX;
        if (i < 0 || i >= this.size || this.voxels[i] === 0)
            voxel |= VoxelChunk.#FACE_PX;

        i = oi - this.offsetX;
        if (i < 0 || i >= this.size || this.voxels[i] === 0)
            voxel |= VoxelChunk.#FACE_NX;

        i = oi + this.offsetY;
        if (i < 0 || i >= this.size || this.voxels[i] === 0)
            voxel |= VoxelChunk.#FACE_PY;

        i = oi - this.offsetY;
        if (i < 0 || i >= this.size || this.voxels[i] === 0)
            voxel |= VoxelChunk.#FACE_NY;

        i = oi + this.offsetZ;
        if (i < 0 || i >= this.size || this.voxels[i] === 0)
            voxel |= VoxelChunk.#FACE_PZ;

        i = oi - this.offsetZ;
        if (i < 0 || i >= this.size || this.voxels[i] === 0)
            voxel |= VoxelChunk.#FACE_NZ;

        this.voxels[oi] = voxel;
    }

    // Sets the instance matrices and colors for each visible face in the chunk and tells the mesh to update.
    // colorFunc() is called with the 10 bit ID of each nonempty voxel and should return a Color.
    constructMesh(colorFunc) {
        const mesh = this.mesh;
        mesh.count = 0;
        let totalFaces = 0;

        for (let x = 0; x < this.spanX; x++)
        for (let y = 0; y < this.spanY; y++)
        for (let z = 0; z < this.spanZ; z++) {
            const oi = x + y * this.offsetY + z * this.offsetZ;
            let voxel = this.voxels[oi];

            if ((voxel & VoxelChunk.#BITMASK_FACES) === 0) continue;
            // Failsafe in case empty voxel has faces set as visible for some reason.
            if ((voxel & VoxelChunk.#BITMASK_ID) === 0) continue;

            const color = colorFunc(voxel & VoxelChunk.#BITMASK_ID);

            if ((voxel & VoxelChunk.#FACE_PX) !== 0) {
                mesh.count++;
                mesh.setMatrixAt(totalFaces, this.makeVoxelPositionMatrix(x, y, z).multiply(VoxelChunk.#MAT_PX));
                mesh.setColorAt(totalFaces, color);
                totalFaces++;
            }

            if ((voxel & VoxelChunk.#FACE_NX) !== 0) {
                mesh.count++;
                mesh.setMatrixAt(totalFaces, this.makeVoxelPositionMatrix(x, y, z).multiply(VoxelChunk.#MAT_NX));
                mesh.setColorAt(totalFaces, color);
                totalFaces++;
            }

            if ((voxel & VoxelChunk.#FACE_PY) !== 0) {
                mesh.count++;
                mesh.setMatrixAt(totalFaces, this.makeVoxelPositionMatrix(x, y, z).multiply(VoxelChunk.#MAT_PY));
                mesh.setColorAt(totalFaces, color);
                totalFaces++;
            }

            if ((voxel & VoxelChunk.#FACE_NY) !== 0) {
                mesh.count++;
                mesh.setMatrixAt(totalFaces, this.makeVoxelPositionMatrix(x, y, z).multiply(VoxelChunk.#MAT_NY));
                mesh.setColorAt(totalFaces, color);
                totalFaces++;
            }

            if ((voxel & VoxelChunk.#FACE_PZ) !== 0) {
                mesh.count++;
                mesh.setMatrixAt(totalFaces, this.makeVoxelPositionMatrix(x, y, z).multiply(VoxelChunk.#MAT_PZ));
                mesh.setColorAt(totalFaces, color);
                totalFaces++;
            }

            if ((voxel & VoxelChunk.#FACE_NZ) !== 0) {
                mesh.count++;
                mesh.setMatrixAt(totalFaces, this.makeVoxelPositionMatrix(x, y, z).multiply(VoxelChunk.#MAT_NZ));
                mesh.setColorAt(totalFaces, color);
                totalFaces++;
            }
        }

        if (totalFaces === 0) {
            mesh.visible = false;
            return;
        }

        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        mesh.visible = true;
    }

    // Makes a translation matrix which shifts from (0, 0, 0) to the position a voxel in this chunk should be at the
    // given coordinates.
    makeVoxelPositionMatrix(x, y, z) {
        return new THREE.Matrix4().makeTranslation(this.posShiftX + x, this.posShiftY + y, this.posShiftZ + z);
    }

    // Set the ID of voxel at given coordinates. Does nothing if coordinates are out of bounds.
    setVoxel(x, y, z, id) {
        const oi = x + y * this.offsetY + z * this.offsetZ;
        if (oi < 0 || oi >= this.size) return;

        if (id === 0) {
            this.voxels[oi] = 0;
            return;
        }

        this.voxels[oi] = this.voxels[oi] | (id & VoxelChunk.#BITMASK_ID);
    }

    // TODO: Function for setting faces based on adjacent chunks
}