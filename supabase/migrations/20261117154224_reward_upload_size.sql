-- Keep multipart certificate uploads below the host request-body limit.
update storage.buckets set file_size_limit=3145728 where id='reward-proofs';
