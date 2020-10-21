(defun org-clock-csv-row-fmt-add-title-to-parents (plist)
  "Add title in front of parents."
  (mapconcat #'identity
	     (list (org-clock-csv--escape (plist-get plist ':task))
		   (concat (plist-get plist ':title) org-clock-csv-headline-separator
			   (org-clock-csv--escape (s-join org-clock-csv-headline-separator
							  (plist-get plist ':parents))))
		   (org-clock-csv--escape (plist-get plist ':category))
		   (plist-get plist ':start)
		   (plist-get plist ':end)
		   (plist-get plist ':effort)
		   (plist-get plist ':ishabit)
		   (plist-get plist ':tags))
	     ","))

(customize-set-variable 'org-clock-csv-row-fmt #'org-clock-csv-row-fmt-add-title-to-parents)
